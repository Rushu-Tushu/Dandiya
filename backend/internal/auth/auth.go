package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/argon2"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailExists        = errors.New("an account with this email already exists")
)

type Argon2Params struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

var DefaultArgon2Params = &Argon2Params{
	Memory:      64 * 1024,
	Iterations:  3,
	Parallelism: 2,
	SaltLength:  16,
	KeyLength:   32,
}

func HashPassword(password string) (string, error) {
	salt := make([]byte, DefaultArgon2Params.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	hash := argon2.IDKey([]byte(password), salt, DefaultArgon2Params.Iterations, DefaultArgon2Params.Memory, DefaultArgon2Params.Parallelism, DefaultArgon2Params.KeyLength)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, DefaultArgon2Params.Memory, DefaultArgon2Params.Iterations, DefaultArgon2Params.Parallelism, b64Salt, b64Hash)
	return encoded, nil
}

func VerifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, errors.New("invalid hash format")
	}

	var version int
	var memory, iterations uint32
	var parallelism uint8
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil {
		return false, err
	}
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism)
	if err != nil {
		return false, err
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}
	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, err
	}

	comparisonHash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(hash)))
	if subtle.ConstantTimeCompare(hash, comparisonHash) == 1 {
		return true, nil
	}
	return false, nil
}

type JWTClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, email, secret string) (string, error) {
	return GenerateTokenWithRole(userID, email, "user", secret)
}

func GenerateTokenWithRole(userID, email, role, secret string) (string, error) {
	if role == "" {
		role = "user"
	}
	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "dandiya-plus-one",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(tokenStr, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// Handlers
type AuthHandler struct {
	repo       database.Repository
	jwtSecret  string
	adminEmail string
}

func NewAuthHandler(repo database.Repository, jwtSecret string, adminEmail ...string) *AuthHandler {
	admin := "admin@dandiya.app"
	if len(adminEmail) > 0 && adminEmail[0] != "" {
		admin = adminEmail[0]
	}
	return &AuthHandler{
		repo:       repo,
		jwtSecret:  jwtSecret,
		adminEmail: admin,
	}
}

func (h *AuthHandler) IsAdminEmail(email string) bool {
	if email == "" || h.adminEmail == "" {
		return false
	}
	parts := strings.Split(h.adminEmail, ",")
	for _, p := range parts {
		clean := strings.TrimSpace(p)
		if clean != "" && strings.EqualFold(email, clean) {
			return true
		}
	}
	return false
}

type RegisterRequest struct {
	Email      string            `json:"email" binding:"required,email"`
	Password   string            `json:"password" binding:"required,min=8"`
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

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	// Check if already registered
	if _, err := h.repo.GetUserByEmail(c.Request.Context(), req.Email); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "An account with this email already exists"})
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	now := time.Now()
	userID := uuid.New().String()
	role := "user"
	if h.IsAdminEmail(req.Email) {
		role = "admin"
	}

	user := &models.User{
		ID:           userID,
		Email:        req.Email,
		PasswordHash: hash,
		Status:       models.UserStatusActive,
		Role:         role,
		IsDemo:       false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := h.repo.CreateUser(c.Request.Context(), user); err != nil {
		if errors.Is(err, database.ErrAlreadyExists) {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	profile := &models.Profile{
		ID:         uuid.New().String(),
		UserID:     userID,
		FirstName:  strings.TrimSpace(req.FirstName),
		LastName:   strings.TrimSpace(req.LastName),
		Age:        req.Age,
		City:       strings.TrimSpace(req.City),
		Sex:        req.Sex,
		DanceLevel: req.DanceLevel,
		LookingFor: req.LookingFor,
		Bio:        strings.TrimSpace(req.Bio),
		PhotoURL:   req.PhotoURL,
		IsDemo:     false,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := h.repo.CreateProfile(c.Request.Context(), profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile"})
		return
	}

	token, err := GenerateTokenWithRole(userID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session token"})
		return
	}

	// Record analytics events
	_ = h.repo.TrackAnalyticsEvent(c.Request.Context(), &models.AnalyticsEvent{
		ID:        uuid.New().String(),
		VisitorID: userID,
		UserID:    userID,
		Type:      models.AnalyticsSignupCompleted,
		Path:      "/register",
		CreatedAt: now,
	})
	_ = h.repo.TrackAnalyticsEvent(c.Request.Context(), &models.AnalyticsEvent{
		ID:        uuid.New().String(),
		VisitorID: userID,
		UserID:    userID,
		Type:      models.AnalyticsProfileComplete,
		Path:      "/profile",
		CreatedAt: now,
	})

	// Set HTTP-only cookie
	c.SetCookie("dandiya_token", token, 3600*24*7, "/", "", false, true)

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"role":      user.Role,
			"createdAt": user.CreatedAt,
		},
		"profile": profile,
	})
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email or password format"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	user, err := h.repo.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Demo profiles cannot authenticate
	if user.IsDemo {
		c.JSON(http.StatusForbidden, gin.H{"error": "Demo profiles are illustrative and cannot be logged into"})
		return
	}

	match, err := VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !match {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if user.Status != models.UserStatusActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account is not active"})
		return
	}

	// Bootstrap admin role if matches admin email
	if h.IsAdminEmail(user.Email) {
		if user.Role != "admin" {
			_ = h.repo.UpdateUserRole(c.Request.Context(), user.ID, "admin")
		}
		user.Role = "admin"
	}
	if user.Role == "" {
		user.Role = "user"
	}

	token, err := GenerateTokenWithRole(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue session token"})
		return
	}

	profile, _ := h.repo.GetProfileByUserID(c.Request.Context(), user.ID)

	c.SetCookie("dandiya_token", token, 3600*24*7, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"role":      user.Role,
			"createdAt": user.CreatedAt,
		},
		"profile": profile,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie("dandiya_token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(string)

	user, err := h.repo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if h.IsAdminEmail(user.Email) {
		if user.Role != "admin" {
			_ = h.repo.UpdateUserRole(c.Request.Context(), user.ID, "admin")
		}
		user.Role = "admin"
	}
	if user.Role == "" {
		user.Role = "user"
	}

	profile, err := h.repo.GetProfileByUserID(c.Request.Context(), userID)
	if err != nil && !errors.Is(err, database.ErrNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"role":      user.Role,
			"createdAt": user.CreatedAt,
		},
		"profile": profile,
	})
}
