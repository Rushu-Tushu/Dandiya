package matches

import (
	"net/http"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
)

type MatchHandler struct {
	repo database.Repository
}

func NewMatchHandler(repo database.Repository) *MatchHandler {
	return &MatchHandler{repo: repo}
}

func (h *MatchHandler) GetMatches(c *gin.Context) {
	currentUserID := c.GetString("userID")
	matches, err := h.repo.GetMatchesForUser(c.Request.Context(), currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch matches"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"matches": matches})
}

func (h *MatchHandler) GetMatchByID(c *gin.Context) {
	currentUserID := c.GetString("userID")
	matchID := c.Param("id")

	match, err := h.repo.GetMatchByID(c.Request.Context(), matchID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	isParticipant := false
	var otherUserID string
	for _, p := range match.ParticipantIDs {
		if p == currentUserID {
			isParticipant = true
		} else {
			otherUserID = p
		}
	}

	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to view this match"})
		return
	}

	if p, err := h.repo.GetProfileByUserID(c.Request.Context(), otherUserID); err == nil {
		match.OtherProfile = p
	}

	if conv, err := h.repo.GetConversationByMatchID(c.Request.Context(), match.ID); err == nil {
		match.ConversationID = conv.ID
	}

	c.JSON(http.StatusOK, match)
}

func (h *MatchHandler) Unmatch(c *gin.Context) {
	currentUserID := c.GetString("userID")
	matchID := c.Param("id")

	match, err := h.repo.GetMatchByID(c.Request.Context(), matchID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	isParticipant := false
	for _, p := range match.ParticipantIDs {
		if p == currentUserID {
			isParticipant = true
			break
		}
	}
	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to modify this match"})
		return
	}

	if err := h.repo.UpdateMatchStatus(c.Request.Context(), matchID, models.MatchStatusUnmatch); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unmatch"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Unmatched successfully"})
}
