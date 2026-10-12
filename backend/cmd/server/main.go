package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/analytics"
	"github.com/dandiya/dandiya-plus-one/internal/auth"
	"github.com/dandiya/dandiya-plus-one/internal/blocks"
	"github.com/dandiya/dandiya-plus-one/internal/chat"
	"github.com/dandiya/dandiya-plus-one/internal/config"
	"github.com/dandiya/dandiya-plus-one/internal/crypto"
	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/discovery"
	"github.com/dandiya/dandiya-plus-one/internal/matches"
	"github.com/dandiya/dandiya-plus-one/internal/middleware"
	"github.com/dandiya/dandiya-plus-one/internal/profiles"
	"github.com/dandiya/dandiya-plus-one/internal/reports"
	"github.com/dandiya/dandiya-plus-one/internal/requests"
	"github.com/dandiya/dandiya-plus-one/internal/seed"
	"github.com/dandiya/dandiya-plus-one/internal/storage"
	"github.com/dandiya/dandiya-plus-one/internal/websocket"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	// Initialize Database (MongoDB Atlas / local Mongo with automatic in-memory fallback)
	ctx := context.Background()
	repo, err := database.InitRepository(ctx, cfg.MongoURI, cfg.DBName)
	if err != nil {
		log.Fatalf("Fatal: repository initialization error: %v", err)
	}

	// Idempotent Demo Profiles Seeding
	if cfg.DemoSeed {
		go func() {
			seedCtx, seedCancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer seedCancel()
			if err := seed.SeedDemoProfiles(seedCtx, repo); err != nil {
				log.Printf("[Demo Seed] Notice: %v", err)
			}
		}()
	}

	// Initialize Local Storage provider for avatars
	fileStorage, err := storage.NewLocalStorage(cfg.UploadDir, "/uploads", cfg.MaxUploadMB)
	if err != nil {
		log.Fatalf("Fatal: storage initialization error: %v", err)
	}

	// Initialize WebSocket Hub
	wsHub := websocket.NewHub(repo, cfg.JWTSecret)
	go wsHub.Run()

	// Initialize Handlers
	authHandler := auth.NewAuthHandler(repo, cfg.JWTSecret, cfg.AdminEmail)
	profileHandler := profiles.NewProfileHandler(repo, fileStorage)
	discoveryHandler := discovery.NewDiscoveryHandler(repo)
	requestHandler := requests.NewRequestHandler(repo)
	matchHandler := matches.NewMatchHandler(repo)
	chatHandler := chat.NewChatHandler(repo)
	cryptoHandler := crypto.NewCryptoHandler(repo)
	blockHandler := blocks.NewBlockHandler(repo)
	reportHandler := reports.NewReportHandler(repo)
	analyticsHandler := analytics.NewAnalyticsHandler(repo)

	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.CORSMiddleware(cfg.AllowedOrigin))

	// Static uploads directory
	router.Static("/uploads", cfg.UploadDir)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"time":   time.Now().UTC(),
			"app":    "Dandiya +1 API",
		})
	})

	// Realtime WebSocket endpoint
	router.GET("/ws", wsHub.HandleWebSocket)

	// API Routes Group
	api := router.Group("/api")
	{
		// Public Auth routes (rate limited: 15 requests per minute)
		authLimiter := middleware.RateLimiter(15, time.Minute)
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authLimiter, authHandler.Register)
			authGroup.POST("/login", authLimiter, authHandler.Login)
			authGroup.POST("/logout", authHandler.Logout)
			authGroup.GET("/me", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Me)
		}

		// Public Analytics event intake (rate limited: 120 per minute)
		analyticsLimiter := middleware.RateLimiter(120, time.Minute)
		api.POST("/analytics/track", analyticsLimiter, analyticsHandler.Track)

		// Authenticated protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			// Profiles
			protected.GET("/profiles/me", profileHandler.GetMyProfile)
			protected.PATCH("/profiles/me", profileHandler.UpdateMyProfile)
			protected.POST("/profiles/photo", profileHandler.UploadPhoto)
			protected.GET("/profiles/:userId", profileHandler.GetProfileByID)

			// Discovery
			protected.GET("/discover", discoveryHandler.Discover)

			// Connection Requests (rate limited: 30 requests per minute)
			reqLimiter := middleware.RateLimiter(30, time.Minute)
			protected.POST("/requests", reqLimiter, requestHandler.SendRequest)
			protected.GET("/requests/incoming", requestHandler.GetIncoming)
			protected.GET("/requests/outgoing", requestHandler.GetOutgoing)
			protected.POST("/requests/:id/accept", requestHandler.AcceptRequest)
			protected.POST("/requests/:id/decline", requestHandler.DeclineRequest)
			protected.DELETE("/requests/:id", requestHandler.CancelRequest)

			// Matches
			protected.GET("/matches", matchHandler.GetMatches)
			protected.GET("/matches/:id", matchHandler.GetMatchByID)
			protected.POST("/matches/:id/unmatch", matchHandler.Unmatch)

			// Conversations & Opaque Encrypted Messages
			protected.GET("/conversations", chatHandler.GetConversations)
			protected.GET("/conversations/:id", chatHandler.GetConversationByID)
			protected.GET("/conversations/:id/messages", chatHandler.GetMessages)
			protected.POST("/conversations/:id/messages", chatHandler.SendMessage)

			// E2EE Public Key Bundles & Zero-Knowledge Key Backups
			protected.POST("/crypto/bundle", cryptoHandler.PublishKeyBundle)
			protected.GET("/crypto/bundle/:userId", cryptoHandler.GetKeyBundle)
			protected.POST("/crypto/backup", cryptoHandler.SaveKeyBackup)
			protected.GET("/crypto/backup", cryptoHandler.GetKeyBackup)

			// Safety: Blocks & Reports
			protected.POST("/blocks", blockHandler.BlockUser)
			protected.DELETE("/blocks/:userId", blockHandler.UnblockUser)
			protected.GET("/blocks", blockHandler.GetBlockedUsers)
			protected.POST("/reports", reportHandler.CreateReport)
		}

		// Admin-Only Protected Analytics Dashboard Routes
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		admin.Use(middleware.AdminMiddleware(cfg.AdminEmail))
		{
			admin.GET("/analytics/overview", analyticsHandler.GetOverview)
			admin.GET("/analytics/funnel", analyticsHandler.GetFunnel)
			admin.GET("/analytics/timeseries", analyticsHandler.GetTimeseries)
			admin.GET("/analytics/traffic", analyticsHandler.GetTraffic)
		}
	}

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("==================================================")
		log.Printf("🎉 Dandiya +1 Backend Server running on port %s", cfg.Port)
		log.Printf("==================================================")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	fmt.Println("Server exiting")
}
