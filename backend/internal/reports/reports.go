package reports

import (
	"net/http"
	"strings"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ReportHandler struct {
	repo database.Repository
}

func NewReportHandler(repo database.Repository) *ReportHandler {
	return &ReportHandler{repo: repo}
}

type CreateReportRequest struct {
	ReportedUserID string `json:"reportedUserId" binding:"required"`
	Reason         string `json:"reason" binding:"required"`
	Details        string `json:"details"`
}

func (h *ReportHandler) CreateReport(c *gin.Context) {
	currentUserID := c.GetString("userID")
	var req CreateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report payload: " + err.Error()})
		return
	}

	if currentUserID == req.ReportedUserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot report yourself"})
		return
	}

	report := &models.Report{
		ID:             uuid.New().String(),
		ReporterID:     currentUserID,
		ReportedUserID: req.ReportedUserID,
		Reason:         strings.TrimSpace(req.Reason),
		Details:        strings.TrimSpace(req.Details),
		CreatedAt:      time.Now(),
	}

	if err := h.repo.CreateReport(c.Request.Context(), report); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Thank you for helping keep Dandiya +1 safe. The report has been recorded.",
	})
}
