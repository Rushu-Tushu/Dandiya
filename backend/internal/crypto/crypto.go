package crypto

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CryptoHandler struct {
	repo database.Repository
}

func NewCryptoHandler(repo database.Repository) *CryptoHandler {
	return &CryptoHandler{repo: repo}
}

type PublishKeyBundleRequest struct {
	IdentityPublicKey string `json:"identityPublicKey" binding:"required"` // Public key string (JWK)
}

func (h *CryptoHandler) PublishKeyBundle(c *gin.Context) {
	currentUserID := c.GetString("userID")
	var req PublishKeyBundleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identity public key is required"})
		return
	}

	// Security validation: verify that private key components ('d', 'priv', etc.) are NOT present in the public key
	pubKeyLower := strings.ToLower(req.IdentityPublicKey)
	if strings.Contains(pubKeyLower, `"d":`) || strings.Contains(pubKeyLower, `"privatekey":`) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Security violation: private key material must NEVER be sent to server"})
		return
	}

	bundle := &models.KeyBundle{
		ID:                uuid.New().String(),
		UserID:            currentUserID,
		IdentityPublicKey: req.IdentityPublicKey,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := h.repo.UpsertKeyBundle(c.Request.Context(), bundle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store public key bundle"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Public key bundle registered"})
}

func (h *CryptoHandler) GetKeyBundle(c *gin.Context) {
	currentUserID := c.GetString("userID")
	targetUserID := c.Param("userId")

	if blocked, _ := h.repo.IsBlocked(c.Request.Context(), currentUserID, targetUserID); blocked {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key bundle not found"})
		return
	}

	bundle, err := h.repo.GetKeyBundle(c.Request.Context(), targetUserID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Public key bundle not found for this user"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve key bundle"})
		return
	}

	c.JSON(http.StatusOK, bundle)
}
