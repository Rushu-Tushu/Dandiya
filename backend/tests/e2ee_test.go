package tests

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"golang.org/x/crypto/hkdf"
)

// Helper for client-side E2EE ECDH + HKDF + AES-256-GCM encryption
func clientEncrypt(plainText string, senderPriv *ecdh.PrivateKey, recipientPub *ecdh.PublicKey, conversationID string) (ciphertextB64, ivB64, senderPubB64 string, err error) {
	// 1. ECDH Shared Secret
	sharedSecret, err := senderPriv.ECDH(recipientPub)
	if err != nil {
		return "", "", "", err
	}

	// 2. HKDF-SHA256 Key Derivation
	hkdfReader := hkdf.New(sha256.New, sharedSecret, []byte(conversationID), []byte("dandiya-e2ee-aes-gcm-256"))
	aesKey := make([]byte, 32)
	if _, err := io.ReadFull(hkdfReader, aesKey); err != nil {
		return "", "", "", err
	}

	// 3. AES-GCM Authenticated Encryption
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return "", "", "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", "", "", err
	}

	iv := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", "", "", err
	}

	ciphertext := gcm.Seal(nil, iv, []byte(plainText), nil)

	return base64.StdEncoding.EncodeToString(ciphertext),
		base64.StdEncoding.EncodeToString(iv),
		base64.StdEncoding.EncodeToString(senderPriv.PublicKey().Bytes()),
		nil
}

// Helper for client-side E2EE ECDH + HKDF + AES-256-GCM decryption
func clientDecrypt(ciphertextB64, ivB64, senderPubB64 string, recipientPriv *ecdh.PrivateKey, conversationID string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", err
	}
	iv, err := base64.StdEncoding.DecodeString(ivB64)
	if err != nil {
		return "", err
	}
	senderPubBytes, err := base64.StdEncoding.DecodeString(senderPubB64)
	if err != nil {
		return "", err
	}

	curve := ecdh.P256()
	senderPub, err := curve.NewPublicKey(senderPubBytes)
	if err != nil {
		return "", err
	}

	// 1. ECDH Shared Secret
	sharedSecret, err := recipientPriv.ECDH(senderPub)
	if err != nil {
		return "", err
	}

	// 2. HKDF-SHA256 Key Derivation
	hkdfReader := hkdf.New(sha256.New, sharedSecret, []byte(conversationID), []byte("dandiya-e2ee-aes-gcm-256"))
	aesKey := make([]byte, 32)
	if _, err := io.ReadFull(hkdfReader, aesKey); err != nil {
		return "", err
	}

	// 3. AES-GCM Authenticated Decryption
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	plaintextBytes, err := gcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintextBytes), nil
}

func TestE2EECompleteFlowAndBackendZeroKnowledge(t *testing.T) {
	ctx := context.Background()
	repo := database.NewMemoryRepository()
	curve := ecdh.P256()

	// --- 1. Client Setup: User A & User B generate ECDH keypairs locally ---
	userAPriv, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate User A key: %v", err)
	}
	userBPriv, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate User B key: %v", err)
	}

	userA_ID := "user-riya-101"
	userB_ID := "user-arjun-202"
	convID := "conv-navratri-999"

	// Publish public keys to backend (Private keys stay STRICTLY on clients)
	userAPubB64 := base64.StdEncoding.EncodeToString(userAPriv.PublicKey().Bytes())
	userBPubB64 := base64.StdEncoding.EncodeToString(userBPriv.PublicKey().Bytes())

	err = repo.UpsertKeyBundle(ctx, &models.KeyBundle{
		UserID:            userA_ID,
		IdentityPublicKey: userAPubB64,
	})
	if err != nil {
		t.Fatalf("Failed to publish User A bundle: %v", err)
	}

	err = repo.UpsertKeyBundle(ctx, &models.KeyBundle{
		UserID:            userB_ID,
		IdentityPublicKey: userBPubB64,
	})
	if err != nil {
		t.Fatalf("Failed to publish User B bundle: %v", err)
	}

	// --- 2. User A prepares message for User B ---
	originalPlaintext := "Hey Arjun! Let's play Dandiya at the Royal Heritage venue tonight! 🪘✨"

	// User A fetches User B's public key from backend
	bundleB, err := repo.GetKeyBundle(ctx, userB_ID)
	if err != nil {
		t.Fatalf("User A failed to get User B key bundle: %v", err)
	}

	pubBBytes, _ := base64.StdEncoding.DecodeString(bundleB.IdentityPublicKey)
	userBPubKey, err := curve.NewPublicKey(pubBBytes)
	if err != nil {
		t.Fatalf("Failed to parse User B public key: %v", err)
	}

	// User A client encrypts
	ciphertext, iv, senderPub, err := clientEncrypt(originalPlaintext, userAPriv, userBPubKey, convID)
	if err != nil {
		t.Fatalf("Client encryption failed: %v", err)
	}

	// --- 3. Backend receives and stores ONLY the opaque envelope ---
	envelope := &models.MessageEnvelope{
		ID:              "msg-1",
		ConversationID:  convID,
		SenderID:        userA_ID,
		RecipientID:     userB_ID,
		Ciphertext:      ciphertext,
		IV:              iv,
		EphemeralPubKey: senderPub,
		SequenceNumber:  1,
		CreatedAt:       time.Now(),
	}

	err = repo.SaveMessage(ctx, envelope)
	if err != nil {
		t.Fatalf("Backend failed to save envelope: %v", err)
	}

	// --- 4. VERIFY: Backend Zero-Knowledge Property ---
	storedMsgs, err := repo.GetMessages(ctx, convID, 10, 0)
	if err != nil || len(storedMsgs) == 0 {
		t.Fatalf("Failed to retrieve stored messages: %v", err)
	}
	storedEnvelope := storedMsgs[0]

	// Prove that plaintext NEVER exists in backend memory/db
	if strings.Contains(storedEnvelope.Ciphertext, "Dandiya") || strings.Contains(storedEnvelope.Ciphertext, "Royal Heritage") {
		t.Fatalf("SECURITY VIOLATION: Backend stored plaintext message content!")
	}
	if strings.Contains(storedEnvelope.IV, "Dandiya") {
		t.Fatalf("SECURITY VIOLATION: IV contains plaintext content!")
	}

	// --- 5. User B fetches encrypted envelope from backend ---
	fetchedEnvelope := storedMsgs[0]

	// User B decrypts using User B's private key
	decryptedPlaintext, err := clientDecrypt(
		fetchedEnvelope.Ciphertext,
		fetchedEnvelope.IV,
		fetchedEnvelope.EphemeralPubKey,
		userBPriv,
		convID,
	)
	if err != nil {
		t.Fatalf("User B client decryption failed: %v", err)
	}

	if decryptedPlaintext != originalPlaintext {
		t.Fatalf("E2EE mismatch: expected '%s', got '%s'", originalPlaintext, decryptedPlaintext)
	}

	// --- 6. Integrity check: tampering detection ---
	// Alter 1 byte of ciphertext (simulating MITM or corrupted backend storage)
	tamperedBytes, _ := base64.StdEncoding.DecodeString(fetchedEnvelope.Ciphertext)
	tamperedBytes[0] ^= 0xFF
	tamperedCiphertext := base64.StdEncoding.EncodeToString(tamperedBytes)

	_, err = clientDecrypt(
		tamperedCiphertext,
		fetchedEnvelope.IV,
		fetchedEnvelope.EphemeralPubKey,
		userBPriv,
		convID,
	)
	if err == nil {
		t.Fatalf("SECURITY VIOLATION: Tampered ciphertext was decrypted without detecting integrity violation!")
	}

	t.Logf("✓ Verified E2EE: Plaintext '%s' successfully encrypted, routed as opaque ciphertext, and decrypted by recipient.", decryptedPlaintext)
}
