package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/analytics"
	"github.com/dandiya/dandiya-plus-one/internal/auth"
	"github.com/dandiya/dandiya-plus-one/internal/chat"
	"github.com/dandiya/dandiya-plus-one/internal/crypto"
	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/middleware"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/dandiya/dandiya-plus-one/internal/requests"
	"github.com/dandiya/dandiya-plus-one/internal/seed"
	"github.com/gin-gonic/gin"
)

func setupTestRouter(repo database.Repository, jwtSecret, adminEmail string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())

	authHandler := auth.NewAuthHandler(repo, jwtSecret, adminEmail)
	chatHandler := chat.NewChatHandler(repo)
	cryptoHandler := crypto.NewCryptoHandler(repo)
	requestHandler := requests.NewRequestHandler(repo)
	analyticsHandler := analytics.NewAnalyticsHandler(repo)

	api := r.Group("/api")
	{
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/analytics/track", analyticsHandler.Track)

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(jwtSecret))
		{
			protected.POST("/requests", requestHandler.SendRequest)
			protected.POST("/conversations/:id/messages", chatHandler.SendMessage)
			protected.GET("/conversations/:id/messages", chatHandler.GetMessages)

			protected.POST("/crypto/backup", cryptoHandler.SaveKeyBackup)
			protected.GET("/crypto/backup", cryptoHandler.GetKeyBackup)
		}

		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(jwtSecret))
		admin.Use(middleware.AdminMiddleware(adminEmail))
		{
			admin.GET("/analytics/overview", analyticsHandler.GetOverview)
			admin.GET("/analytics/funnel", analyticsHandler.GetFunnel)
			admin.GET("/analytics/timeseries", analyticsHandler.GetTimeseries)
			admin.GET("/analytics/traffic", analyticsHandler.GetTraffic)
		}
	}

	return r
}

func TestChatMessageIdempotency(t *testing.T) {
	repo := database.NewMemoryRepository()
	ctx := context.Background()

	conv := &models.Conversation{
		ID:             "conv-test-1",
		MatchID:        "match-1",
		ParticipantIDs: []string{"usr-1", "usr-2"},
		CreatedAt:      time.Now(),
		LastMessageAt:  time.Now(),
	}
	if err := repo.CreateConversation(ctx, conv); err != nil {
		t.Fatalf("Failed to create conversation: %v", err)
	}

	msgID := "client-msg-uuid-999"
	msg := &models.MessageEnvelope{
		ID:              msgID,
		ConversationID:  "conv-test-1",
		SenderID:        "usr-1",
		RecipientID:     "usr-2",
		Ciphertext:      "dGhpcyBpcyBhbiBlbmNyeXB0ZWQgcGF5bG9hZA==",
		IV:              "cmFuZG9tMTJieXRlaXY=",
		EphemeralPubKey: "pubkey-1",
		CreatedAt:       time.Now(),
	}

	// First save
	if err := repo.SaveMessage(ctx, msg); err != nil {
		t.Fatalf("First SaveMessage failed: %v", err)
	}

	// Repeated save with identical ID (simulating duplicate transport delivery)
	if err := repo.SaveMessage(ctx, msg); err != nil {
		t.Fatalf("Second SaveMessage failed: %v", err)
	}

	// Verify only exactly 1 message exists
	messages, err := repo.GetMessages(ctx, "conv-test-1", 50, 0)
	if err != nil {
		t.Fatalf("GetMessages failed: %v", err)
	}

	if len(messages) != 1 {
		t.Fatalf("Expected exactly 1 persisted message, but found %d duplicates!", len(messages))
	}
	if messages[0].ID != msgID {
		t.Fatalf("Expected message ID %s, got %s", msgID, messages[0].ID)
	}
	t.Logf("✓ Chat duplication prevention verified: duplicate send produced exactly 1 persisted record")
}

func TestEncryptedKeyBackupZeroKnowledge(t *testing.T) {
	repo := database.NewMemoryRepository()
	jwtSecret := "test-secret"
	adminEmail := "admin@dandiya.app"
	router := setupTestRouter(repo, jwtSecret, adminEmail)

	token, _ := auth.GenerateToken("user-e2ee-1", "e2ee@dandiya.com", jwtSecret)

	// Test 1: Reject unencrypted private key material
	leakPayload := map[string]interface{}{
		"encryptedKeyJWK": `{"kty":"EC","crv":"P-256","d":"LEAKED_PRIVATE_KEY_BYTES"}`,
		"iv":              "iv123",
		"salt":            "salt123",
		"iterations":      100000,
	}
	leakBody, _ := json.Marshal(leakPayload)
	req := httptest.NewRequest("POST", "/api/crypto/backup", bytes.NewBuffer(leakBody))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected HTTP 400 rejection for unencrypted private key, got %d", w.Code)
	}

	// Test 2: Valid AES-GCM zero-knowledge encrypted backup
	validPayload := map[string]interface{}{
		"encryptedKeyJWK": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=", // Opaque ciphertext
		"iv":              "12byteIVString==",
		"salt":            "32byteSaltString=",
		"iterations":      100000,
	}
	validBody, _ := json.Marshal(validPayload)
	req2 := httptest.NewRequest("POST", "/api/crypto/backup", bytes.NewBuffer(validBody))
	req2.Header.Set("Authorization", "Bearer "+token)
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 for valid encrypted backup, got %d: %s", w2.Code, w2.Body.String())
	}

	// Test 3: Retrieve backup from another device
	req3 := httptest.NewRequest("GET", "/api/crypto/backup", nil)
	req3.Header.Set("Authorization", "Bearer "+token)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)

	if w3.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 on retrieving key backup, got %d", w3.Code)
	}

	var recovered models.EncryptedKeyBackup
	if err := json.Unmarshal(w3.Body.Bytes(), &recovered); err != nil {
		t.Fatalf("Failed to parse recovered key backup: %v", err)
	}
	if recovered.EncryptedKeyJWK != validPayload["encryptedKeyJWK"].(string) {
		t.Fatalf("Mismatched ciphertext payload recovered")
	}
	t.Logf("✓ Zero-knowledge encrypted key backup verified: private keys rejected, opaque envelopes safely synced")
}

func TestDemoProfileGuardsAndIdempotentSeeding(t *testing.T) {
	repo := database.NewMemoryRepository()
	ctx := context.Background()

	// Seed demo profiles
	if err := seed.SeedDemoProfiles(ctx, repo); err != nil {
		t.Fatalf("First seed failed: %v", err)
	}

	// Run seed again to verify idempotency
	if err := seed.SeedDemoProfiles(ctx, repo); err != nil {
		t.Fatalf("Second idempotent seed failed: %v", err)
	}

	// Verify demo profiles in Ahmedabad
	profiles, err := repo.DiscoverProfiles(ctx, "someone-else", "Ahmedabad", "", "", 0, 0, 50, 0)
	if err != nil {
		t.Fatalf("DiscoverProfiles failed: %v", err)
	}
	if len(profiles) < 15 {
		t.Fatalf("Expected at least 15 demo profiles in Ahmedabad, got %d", len(profiles))
	}

	// Verify all seeded profiles have isDemo = true
	for _, p := range profiles {
		if !p.IsDemo {
			t.Fatalf("Expected demo profile %s to have isDemo = true", p.FirstName)
		}
	}

	// Verify demo profile login guard
	jwtSecret := "test-secret"
	adminEmail := "admin@dandiya.app"
	router := setupTestRouter(repo, jwtSecret, adminEmail)

	loginBody, _ := json.Marshal(map[string]string{
		"email":    profiles[0].UserID + "@dandiya.internal",
		"password": "AnyPassword123!",
	})
	loginReq := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	router.ServeHTTP(loginRec, loginReq)

	if loginRec.Code != http.StatusUnauthorized && loginRec.Code != http.StatusForbidden {
		t.Fatalf("Demo profile should never be able to authenticate as normal user, got %d", loginRec.Code)
	}

	// Verify request guard: real user cannot send Dandiya request to demo profile
	realUserToken, _ := auth.GenerateToken("real-user-1", "real@dandiya.com", jwtSecret)
	reqBody, _ := json.Marshal(map[string]string{
		"toUserId": profiles[0].UserID,
	})
	sendReq := httptest.NewRequest("POST", "/api/requests", bytes.NewBuffer(reqBody))
	sendReq.Header.Set("Authorization", "Bearer "+realUserToken)
	sendReq.Header.Set("Content-Type", "application/json")
	sendRec := httptest.NewRecorder()
	router.ServeHTTP(sendRec, sendReq)

	if sendRec.Code != http.StatusBadRequest {
		t.Fatalf("Expected HTTP 400 explaining demo profile, got %d: %s", sendRec.Code, sendRec.Body.String())
	}

	t.Logf("✓ Demo profile safeguards verified: idempotent seed, explicit isDemo tags, login & request blocks active")
}

func TestAdminAnalyticsAuthorizationAndAccuracy(t *testing.T) {
	repo := database.NewMemoryRepository()
	jwtSecret := "test-secret"
	adminEmail := "owner@dandiya.app"
	router := setupTestRouter(repo, jwtSecret, adminEmail)
	ctx := context.Background()

	// 1. Record real and demo analytics events
	now := time.Now().UTC()
	_ = repo.TrackAnalyticsEvent(ctx, &models.AnalyticsEvent{
		ID:        "ev-1",
		VisitorID: "vis-real-1",
		Type:      models.AnalyticsPageView,
		Path:      "/",
		IsDemo:    false,
		CreatedAt: now,
	})
	_ = repo.TrackAnalyticsEvent(ctx, &models.AnalyticsEvent{
		ID:        "ev-2",
		VisitorID: "vis-real-2",
		Type:      models.AnalyticsPageView,
		Path:      "/discover",
		IsDemo:    false,
		CreatedAt: now,
	})
	// Demo event (must NOT be counted)
	_ = repo.TrackAnalyticsEvent(ctx, &models.AnalyticsEvent{
		ID:        "ev-demo-3",
		VisitorID: "vis-demo-99",
		Type:      models.AnalyticsPageView,
		Path:      "/discover",
		IsDemo:    true,
		CreatedAt: now,
	})

	// 2. Regular user tries to access /api/admin/analytics/overview -> 403 Forbidden
	normalToken, _ := auth.GenerateTokenWithRole("usr-regular", "user@gmail.com", "user", jwtSecret)
	adminReq1 := httptest.NewRequest("GET", "/api/admin/analytics/overview", nil)
	adminReq1.Header.Set("Authorization", "Bearer "+normalToken)
	adminRec1 := httptest.NewRecorder()
	router.ServeHTTP(adminRec1, adminReq1)

	if adminRec1.Code != http.StatusForbidden {
		t.Fatalf("Expected HTTP 403 for unauthorized regular user accessing admin analytics, got %d", adminRec1.Code)
	}

	// 3. Admin user accesses /api/admin/analytics/overview -> 200 OK
	adminToken, _ := auth.GenerateTokenWithRole("usr-admin", adminEmail, "admin", jwtSecret)
	adminReq2 := httptest.NewRequest("GET", "/api/admin/analytics/overview", nil)
	adminReq2.Header.Set("Authorization", "Bearer "+adminToken)
	adminRec2 := httptest.NewRecorder()
	router.ServeHTTP(adminRec2, adminReq2)

	if adminRec2.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 for authorized admin, got %d: %s", adminRec2.Code, adminRec2.Body.String())
	}

	var overview models.AnalyticsOverview
	if err := json.Unmarshal(adminRec2.Body.Bytes(), &overview); err != nil {
		t.Fatalf("Failed to decode overview: %v", err)
	}

	// Verify accuracy: 2 real pageviews, demo pageview excluded
	if overview.TotalPageViews != 2 {
		t.Fatalf("Expected 2 real pageviews (excluding demo), got %d", overview.TotalPageViews)
	}
	if overview.TotalUniqueVisitors != 2 {
		t.Fatalf("Expected 2 real unique visitors (excluding demo), got %d", overview.TotalUniqueVisitors)
	}

	t.Logf("✓ Admin analytics verified: strict RBAC authorization, demo event exclusion, metric accuracy confirmed")
}
