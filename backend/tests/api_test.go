package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

type regResponse struct {
	Token   string `json:"token"`
	User    struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
	Profile struct {
		ID        string `json:"id"`
		FirstName string `json:"firstName"`
		City      string `json:"city"`
	} `json:"profile"`
}

func TestFullHTTPFlowAgainstRunningServer(t *testing.T) {
	baseURL := "http://localhost:8080"

	// 1. Health check
	resp, err := http.Get(baseURL + "/health")
	if err != nil {
		t.Skip("Running server not reachable, skipping live HTTP integration test:", err)
		return
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Health check failed: status %d", resp.StatusCode)
	}

	client := &http.Client{Timeout: 5 * time.Second}

	// 2. Register Riya
	riyaPayload := map[string]interface{}{
		"email":      fmt.Sprintf("riya_%d@navratri.test", time.Now().UnixNano()),
		"password":   "RiyaSecurePass2026!",
		"firstName":  "Riya",
		"lastName":   "Patel",
		"age":        22,
		"city":       "Pune",
		"sex":        "F",
		"danceLevel": "Intermediate",
		"lookingFor": "Partner",
		"bio":        "Garba enthusiast in Pune!",
	}
	body, _ := json.Marshal(riyaPayload)
	res, err := client.Post(baseURL+"/api/auth/register", "application/json", bytes.NewReader(body))
	if err != nil || res.StatusCode != http.StatusCreated {
		t.Fatalf("Failed to register Riya: code=%v, err=%v", res.StatusCode, err)
	}
	var riyaAuth regResponse
	_ = json.NewDecoder(res.Body).Decode(&riyaAuth)
	res.Body.Close()

	// 3. Register Arjun
	arjunPayload := map[string]interface{}{
		"email":      fmt.Sprintf("arjun_%d@navratri.test", time.Now().UnixNano()),
		"password":   "ArjunSecurePass2026!",
		"firstName":  "Arjun",
		"lastName":   "Shah",
		"age":        24,
		"city":       "Pune",
		"sex":        "M",
		"danceLevel": "Intermediate",
		"lookingFor": "Partner",
		"bio":        "Ready for Dandiya tonight!",
	}
	body, _ = json.Marshal(arjunPayload)
	res, err = client.Post(baseURL+"/api/auth/register", "application/json", bytes.NewReader(body))
	if err != nil || res.StatusCode != http.StatusCreated {
		t.Fatalf("Failed to register Arjun: code=%v, err=%v", res.StatusCode, err)
	}
	var arjunAuth regResponse
	_ = json.NewDecoder(res.Body).Decode(&arjunAuth)
	res.Body.Close()

	// 4. Riya discovers Arjun
	req, _ := http.NewRequest(http.MethodGet, baseURL+"/api/discover?city=Pune", nil)
	req.Header.Set("Authorization", "Bearer "+riyaAuth.Token)
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusOK {
		t.Fatalf("Discovery failed: %v", res.StatusCode)
	}
	var discRes struct {
		Profiles []struct {
			UserID    string `json:"userId"`
			FirstName string `json:"firstName"`
		} `json:"profiles"`
		Count int `json:"count"`
	}
	_ = json.NewDecoder(res.Body).Decode(&discRes)
	res.Body.Close()

	foundArjun := false
	for _, p := range discRes.Profiles {
		if p.UserID == arjunAuth.User.ID {
			foundArjun = true
			break
		}
	}
	if !foundArjun {
		t.Fatalf("Riya did not discover Arjun in Pune")
	}

	// 5. Riya sends Dandiya Request to Arjun
	reqPayload, _ := json.Marshal(map[string]string{"toUserId": arjunAuth.User.ID})
	req, _ = http.NewRequest(http.MethodPost, baseURL+"/api/requests", bytes.NewReader(reqPayload))
	req.Header.Set("Authorization", "Bearer "+riyaAuth.Token)
	req.Header.Set("Content-Type", "application/json")
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusCreated {
		t.Fatalf("Failed to send Dandiya request: status=%v", res.StatusCode)
	}
	var sendRes struct {
		Request struct {
			ID string `json:"id"`
		} `json:"request"`
	}
	_ = json.NewDecoder(res.Body).Decode(&sendRes)
	res.Body.Close()

	// 6. Arjun fetches incoming requests
	req, _ = http.NewRequest(http.MethodGet, baseURL+"/api/requests/incoming", nil)
	req.Header.Set("Authorization", "Bearer "+arjunAuth.Token)
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusOK {
		t.Fatalf("Arjun incoming requests failed: %v", res.StatusCode)
	}
	var incomingRes struct {
		Requests []struct {
			ID string `json:"id"`
		} `json:"requests"`
	}
	_ = json.NewDecoder(res.Body).Decode(&incomingRes)
	res.Body.Close()
	if len(incomingRes.Requests) != 1 {
		t.Fatalf("Expected 1 incoming request for Arjun, got %d", len(incomingRes.Requests))
	}

	// 7. Arjun accepts -> Match & Conversation created!
	req, _ = http.NewRequest(http.MethodPost, baseURL+"/api/requests/"+sendRes.Request.ID+"/accept", nil)
	req.Header.Set("Authorization", "Bearer "+arjunAuth.Token)
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusOK {
		t.Fatalf("Arjun accept request failed: %v", res.StatusCode)
	}
	var matchRes struct {
		MatchID        string `json:"matchId"`
		ConversationID string `json:"conversationId"`
	}
	_ = json.NewDecoder(res.Body).Decode(&matchRes)
	res.Body.Close()

	if matchRes.MatchID == "" || matchRes.ConversationID == "" {
		t.Fatalf("Expected valid matchId and conversationId on mutual acceptance")
	}

	// 8. Riya sends opaque encrypted message envelope
	envelopePayload, _ := json.Marshal(map[string]interface{}{
		"ciphertext":      "OpaqueCiphertextPayloadAES256GCM==",
		"iv":              "dF92NmP+L1w0",
		"ephemeralPubKey": `{"kty":"EC","crv":"P-256","x":"sample_x","y":"sample_y"}`,
		"sequenceNumber":  1,
	})
	req, _ = http.NewRequest(http.MethodPost, baseURL+"/api/conversations/"+matchRes.ConversationID+"/messages", bytes.NewReader(envelopePayload))
	req.Header.Set("Authorization", "Bearer "+riyaAuth.Token)
	req.Header.Set("Content-Type", "application/json")
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusCreated {
		t.Fatalf("Failed to send encrypted envelope: %v", res.StatusCode)
	}
	res.Body.Close()

	// 9. Arjun retrieves messages
	req, _ = http.NewRequest(http.MethodGet, baseURL+"/api/conversations/"+matchRes.ConversationID+"/messages", nil)
	req.Header.Set("Authorization", "Bearer "+arjunAuth.Token)
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusOK {
		t.Fatalf("Failed to get messages: %v", res.StatusCode)
	}
	var msgsRes struct {
		Messages []struct {
			Ciphertext string `json:"ciphertext"`
			IV         string `json:"iv"`
		} `json:"messages"`
	}
	_ = json.NewDecoder(res.Body).Decode(&msgsRes)
	res.Body.Close()

	if len(msgsRes.Messages) != 1 {
		t.Fatalf("Expected 1 message, got %d", len(msgsRes.Messages))
	}
	if msgsRes.Messages[0].Ciphertext != "OpaqueCiphertextPayloadAES256GCM==" {
		t.Fatalf("Ciphertext mismatch in backend store")
	}

	// 10. Security: Third party cannot access conversation messages
	unauthorizedToken, _ := client.Post(baseURL+"/api/auth/register", "application/json", strings.NewReader(`{
		"email": "eve@navratri.test", "password": "EvePassword2026!", "firstName": "Eve", "age": 25, "city": "Pune", "sex": "F", "danceLevel": "Pro", "lookingFor": "Partner"
	}`))
	var eveAuth regResponse
	_ = json.NewDecoder(unauthorizedToken.Body).Decode(&eveAuth)
	unauthorizedToken.Body.Close()

	req, _ = http.NewRequest(http.MethodGet, baseURL+"/api/conversations/"+matchRes.ConversationID+"/messages", nil)
	req.Header.Set("Authorization", "Bearer "+eveAuth.Token)
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusForbidden {
		t.Fatalf("Expected 403 Forbidden for unauthorized user reading conversation, got %v", res.StatusCode)
	}
	res.Body.Close()

	// 11. Security: Self-request is rejected
	selfReq, _ := json.Marshal(map[string]string{"toUserId": riyaAuth.User.ID})
	req, _ = http.NewRequest(http.MethodPost, baseURL+"/api/requests", bytes.NewReader(selfReq))
	req.Header.Set("Authorization", "Bearer "+riyaAuth.Token)
	req.Header.Set("Content-Type", "application/json")
	res, err = client.Do(req)
	if err != nil || res.StatusCode != http.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request for self-request, got %v", res.StatusCode)
	}
	res.Body.Close()

	t.Log("PASS: Complete HTTP API Flow, Mutual Matching, Encrypted Envelope Routing, and Security Verification succeeded!")
}
