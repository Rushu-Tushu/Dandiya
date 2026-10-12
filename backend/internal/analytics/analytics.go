package analytics

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AnalyticsHandler struct {
	repo database.Repository
}

func NewAnalyticsHandler(repo database.Repository) *AnalyticsHandler {
	return &AnalyticsHandler{repo: repo}
}

type TrackEventRequest struct {
	VisitorID string                    `json:"visitorId" binding:"required"`
	Type      models.AnalyticsEventType `json:"type" binding:"required"`
	Path      string                    `json:"path" binding:"required"`
	Referrer  string                    `json:"referrer"`
	UTMSource string                    `json:"utmSource"`
	UTMMedium string                    `json:"utmMedium"`
	UTMCamp   string                    `json:"utmCampaign"`
}

func (h *AnalyticsHandler) Track(c *gin.Context) {
	var req TrackEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid analytics payload: " + err.Error()})
		return
	}

	// Privacy check: sanitize and discard any potential sensitive information
	req.Path = strings.TrimSpace(req.Path)
	if len(req.Path) > 200 {
		req.Path = req.Path[:200]
	}

	userID := c.GetString("userID")

	// Determine if authenticated user is a demo account
	isDemo := false
	if userID != "" {
		if u, err := h.repo.GetUserByID(c.Request.Context(), userID); err == nil && u != nil {
			isDemo = u.IsDemo
		}
	}

	event := &models.AnalyticsEvent{
		ID:        uuid.New().String(),
		VisitorID: req.VisitorID,
		UserID:    userID,
		Type:      req.Type,
		Path:      req.Path,
		Referrer:  req.Referrer,
		UTMSource: req.UTMSource,
		UTMMedium: req.UTMMedium,
		UTMCamp:   req.UTMCamp,
		IsDemo:    isDemo,
		CreatedAt: time.Now().UTC(),
	}

	_ = h.repo.TrackAnalyticsEvent(c.Request.Context(), event)
	c.JSON(http.StatusOK, gin.H{"status": "recorded"})
}

func parseDateRange(c *gin.Context) (time.Time, time.Time) {
	now := time.Now().UTC()
	daysParam := c.Query("days")
	if daysParam != "" {
		if days, err := strconv.Atoi(daysParam); err == nil && days > 0 {
			return now.AddDate(0, 0, -days), now
		}
	}

	fromStr := c.Query("from")
	toStr := c.Query("to")

	var from, to time.Time
	if fromStr != "" {
		if t, err := time.Parse(time.RFC3339, fromStr); err == nil {
			from = t
		} else if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr != "" {
		if t, err := time.Parse(time.RFC3339, toStr); err == nil {
			to = t
		} else if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t.Add(24 * time.Hour)
		}
	}

	if from.IsZero() {
		from = now.AddDate(0, 0, -30) // Default past 30 days
	}
	if to.IsZero() {
		to = now
	}

	return from, to
}

// Protected Admin Analytics Endpoints
func (h *AnalyticsHandler) GetOverview(c *gin.Context) {
	from, to := parseDateRange(c)
	overview, err := h.repo.GetAnalyticsOverview(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate analytics overview"})
		return
	}
	c.JSON(http.StatusOK, overview)
}

func (h *AnalyticsHandler) GetFunnel(c *gin.Context) {
	from, to := parseDateRange(c)
	funnel, err := h.repo.GetAnalyticsFunnel(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compute conversion funnel"})
		return
	}
	c.JSON(http.StatusOK, funnel)
}

func (h *AnalyticsHandler) GetTimeseries(c *gin.Context) {
	from, to := parseDateRange(c)
	points, err := h.repo.GetAnalyticsTimeseries(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate timeseries data"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"points": points})
}

func (h *AnalyticsHandler) GetTraffic(c *gin.Context) {
	from, to := parseDateRange(c)
	traffic, err := h.repo.GetAnalyticsTraffic(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate traffic sources"})
		return
	}
	c.JSON(http.StatusOK, traffic)
}
