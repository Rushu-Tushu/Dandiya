package blocks

import (
	"net/http"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BlockHandler struct {
	repo database.Repository
}

func NewBlockHandler(repo database.Repository) *BlockHandler {
	return &BlockHandler{repo: repo}
}

type BlockUserRequest struct {
	TargetUserID string `json:"targetUserId" binding:"required"`
}

func (h *BlockHandler) BlockUser(c *gin.Context) {
	currentUserID := c.GetString("userID")
	var req BlockUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target user ID is required"})
		return
	}

	if currentUserID == req.TargetUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot block yourself"})
		return
	}

	block := &models.Block{
		ID:        uuid.New().String(),
		BlockerID: currentUserID,
		BlockedID: req.TargetUserID,
		CreatedAt: time.Now(),
	}

	if err := h.repo.CreateBlock(c.Request.Context(), block); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to block user"})
		return
	}

	// Terminate active match if one exists
	if match, err := h.repo.GetMatchBetweenUsers(c.Request.Context(), currentUserID, req.TargetUserID); err == nil && match != nil {
		_ = h.repo.UpdateMatchStatus(c.Request.Context(), match.ID, models.MatchStatusBlocked)
	}

	c.JSON(http.StatusOK, gin.H{"message": "User blocked successfully"})
}

func (h *BlockHandler) UnblockUser(c *gin.Context) {
	currentUserID := c.GetString("userID")
	targetUserID := c.Param("userId")

	if err := h.repo.DeleteBlock(c.Request.Context(), currentUserID, targetUserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unblock user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User unblocked successfully"})
}

func (h *BlockHandler) GetBlockedUsers(c *gin.Context) {
	currentUserID := c.GetString("userID")
	ids, err := h.repo.GetBlockedUserIDs(c.Request.Context(), currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve blocked users"})
		return
	}

	var blockedProfiles []*models.Profile
	for _, id := range ids {
		if p, err := h.repo.GetProfileByUserID(c.Request.Context(), id); err == nil {
			blockedProfiles = append(blockedProfiles, p)
		}
	}
	if blockedProfiles == nil {
		blockedProfiles = []*models.Profile{}
	}

	c.JSON(http.StatusOK, gin.H{"blockedUsers": blockedProfiles})
}
