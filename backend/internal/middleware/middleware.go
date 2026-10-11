package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/auth"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			cookie, err := c.Cookie("dandiya_token")
			if err == nil {
				tokenStr = cookie
			}
		}

		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		claims, err := auth.ParseToken(tokenStr, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired session"})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Next()
	}
}

func CORSMiddleware(allowedOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			// If origin matches or wildcard during local dev
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}

// In-Memory Rate Limiter for anti-abuse and spam protection
type rateLimiter struct {
	mu      sync.Mutex
	clients map[string]*clientBucket
	limit   int
	window  time.Duration
}

type clientBucket struct {
	count     int
	resetTime time.Time
}

func RateLimiter(limit int, window time.Duration) gin.HandlerFunc {
	rl := &rateLimiter{
		clients: make(map[string]*clientBucket),
		limit:   limit,
		window:  window,
	}

	// Periodic cleanup routine
	go func() {
		for {
			time.Sleep(window * 2)
			rl.mu.Lock()
			now := time.Now()
			for ip, b := range rl.clients {
				if now.After(b.resetTime) {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		rl.mu.Lock()
		now := time.Now()
		bucket, exists := rl.clients[ip]
		if !exists || now.After(bucket.resetTime) {
			rl.clients[ip] = &clientBucket{
				count:     1,
				resetTime: now.Add(window),
			}
			rl.mu.Unlock()
			c.Next()
			return
		}

		if bucket.count >= rl.limit {
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests. Please slow down."})
			return
		}

		bucket.count++
		rl.mu.Unlock()
		c.Next()
	}
}
