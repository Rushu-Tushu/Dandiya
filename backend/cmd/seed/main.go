package main

import (
	"context"
	"log"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/config"
	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/seed"
)

func main() {
	log.Println("🪘 Dandiya +1 — Starting Idempotent Demo Seed Utility...")

	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	repo, err := database.InitRepository(ctx, cfg.MongoURI, cfg.DBName)
	if err != nil {
		log.Fatalf("Fatal: repository initialization failed: %v", err)
	}

	if err := seed.SeedDemoProfiles(ctx, repo); err != nil {
		log.Fatalf("Fatal: demo seed failed: %v", err)
	}

	log.Println("✅ Demo seed completed successfully without modifying real user records.")
}
