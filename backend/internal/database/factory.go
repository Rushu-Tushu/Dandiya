package database

import (
	"context"
	"log"
	"strings"
	"time"
)

func InitRepository(ctx context.Context, uri, dbName string) (Repository, error) {
	if uri == "" || strings.HasPrefix(uri, "memory://") {
		log.Println("[Database] Using high-performance thread-safe In-Memory database")
		return NewMemoryRepository(), nil
	}

	log.Printf("[Database] Connecting to MongoDB: %s ...", uri)
	connectCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	repo, err := NewMongoRepository(connectCtx, uri, dbName)
	if err != nil {
		log.Printf("[Database] MongoDB connection failed (%v). Falling back to In-Memory repository for local resilience.", err)
		return NewMemoryRepository(), nil
	}

	log.Println("[Database] Successfully connected to MongoDB Atlas / Local MongoDB instance with established indexes!")
	return repo, nil
}
