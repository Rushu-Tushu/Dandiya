package profiles

import (
	"errors"
	"net/http"
	"strings"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/dandiya/dandiya-plus-one/internal/storage"
	"github.com/gin-gonic/gin"
)

type ProfileHandler struct {
	repo    database.Repository
	storage storage.StorageProvider
}

func NewProfileHandler(repo database.Repository, storage storage.StorageProvider) *ProfileHandler {
	return &ProfileHandler{
		repo:    repo,
		storage: storage,
	}
}

type UpdateProfileRequest struct {
	FirstName  string            `json:"firstName" binding:"required"`
	LastName   string            `json:"lastName"`
	Age        int               `json:"age" binding:"required,min=18,max=99"`
	City       string            `json:"city" binding:"required"`
	Sex        string            `json:"sex" binding:"required"`
	DanceLevel models.DanceLevel `json:"danceLevel" binding:"required"`
	LookingFor models.LookingFor `json:"lookingFor" binding:"required"`
	Bio        string            `json:"bio"`
	PhotoURL   string            `json:"photoUrl"`
}

func (h *ProfileHandler) GetMyProfile(c *gin.Context) {
	userID := c.GetString("userID")
	profile, err := h.repo.GetProfileByUserID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Profile not created yet"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch profile"})
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) UpdateMyProfile(c *gin.Context) {
	userID := c.GetString("userID")
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile data: " + err.Error()})
		return
	}

	profile, err := h.repo.GetProfileByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	profile.FirstName = strings.TrimSpace(req.FirstName)
	profile.LastName = strings.TrimSpace(req.LastName)
	profile.Age = req.Age
	profile.City = strings.TrimSpace(req.City)
	profile.Sex = req.Sex
	profile.DanceLevel = req.DanceLevel
	profile.LookingFor = req.LookingFor
	profile.Bio = strings.TrimSpace(req.Bio)
	if req.PhotoURL != "" {
		profile.PhotoURL = req.PhotoURL
	}

	if err := h.repo.UpdateProfile(c.Request.Context(), profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) UploadPhoto(c *gin.Context) {
	userID := c.GetString("userID")

	fileHeader, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No photo file provided"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to read uploaded file"})
		return
	}
	defer file.Close()

	photoURL, err := h.storage.SaveFile(file, fileHeader.Filename, fileHeader.Size)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profile, err := h.repo.GetProfileByUserID(c.Request.Context(), userID)
	if err == nil && profile != nil {
		profile.PhotoURL = photoURL
		_ = h.repo.UpdateProfile(c.Request.Context(), profile)
	}

	c.JSON(http.StatusOK, gin.H{
		"photoUrl": photoURL,
		"message":  "Photo uploaded successfully",
	})
}

func (h *ProfileHandler) GetProfileByID(c *gin.Context) {
	currentUserID := c.GetString("userID")
	targetUserID := c.Param("userId")

	if blocked, _ := h.repo.IsBlocked(c.Request.Context(), currentUserID, targetUserID); blocked {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	profile, err := h.repo.GetProfileByUserID(c.Request.Context(), targetUserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	c.JSON(http.StatusOK, profile)
}
