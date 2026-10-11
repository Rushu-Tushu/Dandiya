package requests

import (
	"net/http"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RequestHandler struct {
	repo database.Repository
}

func NewRequestHandler(repo database.Repository) *RequestHandler {
	return &RequestHandler{repo: repo}
}

type CreateRequestDTO struct {
	ToUserID string `json:"toUserId" binding:"required"`
}

func (h *RequestHandler) SendRequest(c *gin.Context) {
	currentUserID := c.GetString("userID")
	var req CreateRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target user ID is required"})
		return
	}

	if currentUserID == req.ToUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot send a Dandiya request to yourself"})
		return
	}

	// Verify target user exists
	if _, err := h.repo.GetUserByID(c.Request.Context(), req.ToUserID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check blocked
	if blocked, _ := h.repo.IsBlocked(c.Request.Context(), currentUserID, req.ToUserID); blocked {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot send request to this user"})
		return
	}

	// Check existing request
	if existing, err := h.repo.GetActiveRequestBetween(c.Request.Context(), currentUserID, req.ToUserID); err == nil && existing != nil {
		// If existing was sent by other user, this is a mutual instant match!
		if existing.FromUserID == req.ToUserID && existing.Status == models.RequestStatusPending {
			// Auto-accept!
			h.acceptAndCreateMatch(c, existing.ID, currentUserID)
			return
		}
		c.JSON(http.StatusConflict, gin.H{"error": "A Dandiya request is already active with this user"})
		return
	}

	now := time.Now()
	connReq := &models.ConnectionRequest{
		ID:         uuid.New().String(),
		FromUserID: currentUserID,
		ToUserID:   req.ToUserID,
		Status:     models.RequestStatusPending,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := h.repo.CreateRequest(c.Request.Context(), connReq); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Dandiya request sent successfully",
		"request": connReq,
	})
}

func (h *RequestHandler) AcceptRequest(c *gin.Context) {
	requestID := c.Param("id")
	currentUserID := c.GetString("userID")
	h.acceptAndCreateMatch(c, requestID, currentUserID)
}

func (h *RequestHandler) acceptAndCreateMatch(c *gin.Context, requestID, currentUserID string) {
	connReq, err := h.repo.GetRequestByID(c.Request.Context(), requestID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	// Only recipient can accept
	if connReq.ToUserID != currentUserID && connReq.FromUserID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to accept this request"})
		return
	}

	if connReq.Status == models.RequestStatusAccepted {
		c.JSON(http.StatusOK, gin.H{"message": "Request was already accepted"})
		return
	}

	// Update status
	if err := h.repo.UpdateRequestStatus(c.Request.Context(), requestID, models.RequestStatusAccepted); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept request"})
		return
	}

	// Create Match & Conversation atomically
	now := time.Now()
	matchID := uuid.New().String()
	convID := uuid.New().String()

	match := &models.Match{
		ID:             matchID,
		ParticipantIDs: []string{connReq.FromUserID, connReq.ToUserID},
		Status:         models.MatchStatusActive,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := h.repo.CreateMatch(c.Request.Context(), match); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create match"})
		return
	}

	conv := &models.Conversation{
		ID:             convID,
		MatchID:        matchID,
		ParticipantIDs: []string{connReq.FromUserID, connReq.ToUserID},
		CreatedAt:      now,
		UpdatedAt:      now,
		LastMessageAt:  now,
	}
	if err := h.repo.CreateConversation(c.Request.Context(), conv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate conversation"})
		return
	}

	// Load other user profile
	otherID := connReq.FromUserID
	if otherID == currentUserID {
		otherID = connReq.ToUserID
	}
	otherProfile, _ := h.repo.GetProfileByUserID(c.Request.Context(), otherID)

	c.JSON(http.StatusOK, gin.H{
		"message":        "🎉 You matched! You both want someone to play Dandiya with.",
		"matchId":        matchID,
		"conversationId": convID,
		"otherProfile":   otherProfile,
	})
}

func (h *RequestHandler) DeclineRequest(c *gin.Context) {
	requestID := c.Param("id")
	currentUserID := c.GetString("userID")

	connReq, err := h.repo.GetRequestByID(c.Request.Context(), requestID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	if connReq.ToUserID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to decline this request"})
		return
	}

	if err := h.repo.UpdateRequestStatus(c.Request.Context(), requestID, models.RequestStatusDeclined); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decline request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Request declined"})
}

func (h *RequestHandler) CancelRequest(c *gin.Context) {
	requestID := c.Param("id")
	currentUserID := c.GetString("userID")

	connReq, err := h.repo.GetRequestByID(c.Request.Context(), requestID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	if connReq.FromUserID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to cancel this request"})
		return
	}

	_ = h.repo.UpdateRequestStatus(c.Request.Context(), requestID, models.RequestStatusDeclined)
	c.JSON(http.StatusOK, gin.H{"message": "Request cancelled"})
}

func (h *RequestHandler) GetIncoming(c *gin.Context) {
	currentUserID := c.GetString("userID")
	requests, err := h.repo.GetIncomingRequests(c.Request.Context(), currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch incoming requests"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

func (h *RequestHandler) GetOutgoing(c *gin.Context) {
	currentUserID := c.GetString("userID")
	requests, err := h.repo.GetOutgoingRequests(c.Request.Context(), currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outgoing requests"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}
