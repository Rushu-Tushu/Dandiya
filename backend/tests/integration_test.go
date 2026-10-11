package tests

import (
	"context"
	"testing"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/auth"
	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
)

func TestAuthAndArgon2id(t *testing.T) {
	password := "Navratri@2026!Garba"
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	match, err := auth.VerifyPassword(password, hash)
	if err != nil || !match {
		t.Fatalf("Password verification failed for valid password")
	}

	wrongMatch, _ := auth.VerifyPassword("WrongPassword123", hash)
	if wrongMatch {
		t.Fatalf("Password verification succeeded for incorrect password!")
	}

	// Test JWT
	secret := "test-secret-key-12345"
	token, err := auth.GenerateToken("user-1", "test@dandiya.com", secret)
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	claims, err := auth.ParseToken(token, secret)
	if err != nil || claims.UserID != "user-1" {
		t.Fatalf("JWT validation failed")
	}
}

func TestMatchingAndSafetyFlow(t *testing.T) {
	ctx := context.Background()
	repo := database.NewMemoryRepository()

	// 1. Create Users
	user1 := &models.User{ID: "u1", Email: "riya@test.com", Status: models.UserStatusActive, CreatedAt: time.Now()}
	user2 := &models.User{ID: "u2", Email: "arjun@test.com", Status: models.UserStatusActive, CreatedAt: time.Now()}
	_ = repo.CreateUser(ctx, user1)
	_ = repo.CreateUser(ctx, user2)

	// 2. Create Profiles
	p1 := &models.Profile{
		UserID:     "u1",
		FirstName:  "Riya",
		Age:        22,
		City:       "Ahmedabad",
		Sex:        "F",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Ready for Garba nights!",
	}
	p2 := &models.Profile{
		UserID:     "u2",
		FirstName:  "Arjun",
		Age:        24,
		City:       "Ahmedabad",
		Sex:        "M",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Dodhiyu enthusiast.",
	}
	_ = repo.CreateProfile(ctx, p1)
	_ = repo.CreateProfile(ctx, p2)

	// 3. Discovery test
	discovered, err := repo.DiscoverProfiles(ctx, "u1", "Ahmedabad", models.LookingForPartner, models.DanceLevelIntermediate, 18, 30, 10, 0)
	if err != nil || len(discovered) == 0 {
		t.Fatalf("Discovery failed to find compatible partner: %v", err)
	}
	if discovered[0].UserID != "u2" {
		t.Fatalf("Expected to discover Arjun, found %s", discovered[0].UserID)
	}

	// 4. Send request from Riya to Arjun
	req := &models.ConnectionRequest{
		ID:         "req-1",
		FromUserID: "u1",
		ToUserID:   "u2",
		Status:     models.RequestStatusPending,
		CreatedAt:  time.Now(),
	}
	_ = repo.CreateRequest(ctx, req)

	// Arjun checks incoming requests
	incoming, err := repo.GetIncomingRequests(ctx, "u2")
	if err != nil || len(incoming) != 1 {
		t.Fatalf("Incoming requests failed for recipient")
	}

	// 5. Mutual Acceptance: Arjun accepts
	_ = repo.UpdateRequestStatus(ctx, "req-1", models.RequestStatusAccepted)

	match := &models.Match{
		ID:             "match-1",
		ParticipantIDs: []string{"u1", "u2"},
		Status:         models.MatchStatusActive,
		CreatedAt:      time.Now(),
	}
	_ = repo.CreateMatch(ctx, match)

	conv := &models.Conversation{
		ID:             "conv-1",
		MatchID:        "match-1",
		ParticipantIDs: []string{"u1", "u2"},
		CreatedAt:      time.Now(),
	}
	_ = repo.CreateConversation(ctx, conv)

	// Verify matches for both users
	m1, _ := repo.GetMatchesForUser(ctx, "u1")
	m2, _ := repo.GetMatchesForUser(ctx, "u2")
	if len(m1) != 1 || len(m2) != 1 {
		t.Fatalf("Both users should have 1 active match")
	}

	// 6. Test Safety: Block
	block := &models.Block{
		ID:        "b-1",
		BlockerID: "u1",
		BlockedID: "u2",
		CreatedAt: time.Now(),
	}
	_ = repo.CreateBlock(ctx, block)

	isBlocked, _ := repo.IsBlocked(ctx, "u1", "u2")
	if !isBlocked {
		t.Fatalf("Block check failed")
	}

	// Verify discovery hides blocked user
	discoveredAfterBlock, _ := repo.DiscoverProfiles(ctx, "u1", "Ahmedabad", "", "", 0, 0, 10, 0)
	if len(discoveredAfterBlock) != 0 {
		t.Fatalf("Blocked user should not appear in discovery")
	}

	t.Log("✓ Matching, Discovery, and Safety integration test passed successfully!")
}
