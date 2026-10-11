package discovery

import (
	"net/http"
	"strconv"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
)

type DiscoveryHandler struct {
	repo database.Repository
}

func NewDiscoveryHandler(repo database.Repository) *DiscoveryHandler {
	return &DiscoveryHandler{repo: repo}
}

func (h *DiscoveryHandler) Discover(c *gin.Context) {
	currentUserID := c.GetString("userID")

	// Get current user's profile to default to their city if not passed
	userProfile, _ := h.repo.GetProfileByUserID(c.Request.Context(), currentUserID)

	city := c.Query("city")
	if city == "" && userProfile != nil {
		city = userProfile.City
	}

	lookingFor := models.LookingFor(c.Query("lookingFor"))
	danceLevel := models.DanceLevel(c.Query("danceLevel"))

	minAge, _ := strconv.Atoi(c.Query("minAge"))
	maxAge, _ := strconv.Atoi(c.Query("maxAge"))

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	profiles, err := h.repo.DiscoverProfiles(c.Request.Context(), currentUserID, city, lookingFor, danceLevel, minAge, maxAge, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to discover partners"})
		return
	}

	// Filter out users with active connection requests or existing matches
	outgoing, _ := h.repo.GetOutgoingRequests(c.Request.Context(), currentUserID)
	requestedMap := make(map[string]bool)
	for _, req := range outgoing {
		if req.Status == models.RequestStatusPending || req.Status == models.RequestStatusAccepted {
			requestedMap[req.ToUserID] = true
		}
	}

	matches, _ := h.repo.GetMatchesForUser(c.Request.Context(), currentUserID)
	for _, m := range matches {
		for _, p := range m.ParticipantIDs {
			requestedMap[p] = true
		}
	}

	var availableProfiles []*models.Profile
	for _, p := range profiles {
		if !requestedMap[p.UserID] {
			availableProfiles = append(availableProfiles, p)
		}
	}
	if availableProfiles == nil {
		availableProfiles = []*models.Profile{}
	}

	c.JSON(http.StatusOK, gin.H{
		"profiles": availableProfiles,
		"city":     city,
		"count":    len(availableProfiles),
	})
}
