package chat

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ChatHandler struct {
	repo database.Repository
}

func NewChatHandler(repo database.Repository) *ChatHandler {
	return &ChatHandler{repo: repo}
}

func (h *ChatHandler) GetConversations(c *gin.Context) {
	currentUserID := c.GetString("userID")
	convs, err := h.repo.GetConversationsForUser(c.Request.Context(), currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch conversations"})
		return
	}

	type ConvWithProfile struct {
		*models.Conversation
		OtherProfile *models.Profile `json:"otherProfile,omitempty"`
	}

	result := make([]*ConvWithProfile, 0, len(convs))
	for _, conv := range convs {
		otherID := conv.ParticipantIDs[0]
		if otherID == currentUserID {
			otherID = conv.ParticipantIDs[1]
		}
		item := &ConvWithProfile{Conversation: conv}
		if p, err := h.repo.GetProfileByUserID(c.Request.Context(), otherID); err == nil {
			item.OtherProfile = p
		}
		result = append(result, item)
	}

	c.JSON(http.StatusOK, gin.H{"conversations": result})
}

func (h *ChatHandler) GetConversationByID(c *gin.Context) {
	currentUserID := c.GetString("userID")
	convID := c.Param("id")

	conv, err := h.repo.GetConversationByID(c.Request.Context(), convID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	isParticipant := false
	var otherID string
	for _, p := range conv.ParticipantIDs {
		if p == currentUserID {
			isParticipant = true
		} else {
			otherID = p
		}
	}
	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to access this conversation"})
		return
	}

	var otherProfile *models.Profile
	if p, err := h.repo.GetProfileByUserID(c.Request.Context(), otherID); err == nil {
		otherProfile = p
	}

	c.JSON(http.StatusOK, gin.H{
		"conversation": conv,
		"otherProfile": otherProfile,
	})
}

func (h *ChatHandler) GetMessages(c *gin.Context) {
	currentUserID := c.GetString("userID")
	convID := c.Param("id")

	conv, err := h.repo.GetConversationByID(c.Request.Context(), convID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	isParticipant := false
	for _, p := range conv.ParticipantIDs {
		if p == currentUserID {
			isParticipant = true
			break
		}
	}
	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to view messages in this conversation"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	messages, err := h.repo.GetMessages(c.Request.Context(), convID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

type SendMessageEnvelopeRequest struct {
	Ciphertext      string `json:"ciphertext" binding:"required"`
	IV              string `json:"iv" binding:"required"`
	EphemeralPubKey string `json:"ephemeralPubKey" binding:"required"`
	SequenceNumber  int64  `json:"sequenceNumber"`
}

func (h *ChatHandler) SendMessage(c *gin.Context) {
	currentUserID := c.GetString("userID")
	convID := c.Param("id")

	var req SendMessageEnvelopeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encrypted payload format: " + err.Error()})
		return
	}

	conv, err := h.repo.GetConversationByID(c.Request.Context(), convID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	isParticipant := false
	var recipientID string
	for _, p := range conv.ParticipantIDs {
		if p == currentUserID {
			isParticipant = true
		} else {
			recipientID = p
		}
	}
	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to send messages in this conversation"})
		return
	}

	// Check if blocked
	if blocked, _ := h.repo.IsBlocked(c.Request.Context(), currentUserID, recipientID); blocked {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot send message to this user"})
		return
	}

	now := time.Now()
	msg := &models.MessageEnvelope{
		ID:              uuid.New().String(),
		ConversationID:  convID,
		SenderID:        currentUserID,
		RecipientID:     recipientID,
		Ciphertext:      req.Ciphertext,
		IV:              req.IV,
		EphemeralPubKey: req.EphemeralPubKey,
		SequenceNumber:  req.SequenceNumber,
		CreatedAt:       now,
	}

	if err := h.repo.SaveMessage(c.Request.Context(), msg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message envelope"})
		return
	}

	_ = h.repo.UpdateConversationLastMessage(c.Request.Context(), convID)

	c.JSON(http.StatusCreated, msg)
}
