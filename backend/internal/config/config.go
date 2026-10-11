package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	MongoURI      string
	DBName        string
	JWTSecret     string
	UploadDir     string
	AllowedOrigin string
	MaxUploadMB   int64
}

func Load() *Config {
	// Attempt loading .env file if it exists, ignore error if absent
	if err := godotenv.Load(); err != nil {
		// Non-fatal, fallback to system env
	}

	port := getEnv("PORT", "8080")
	mongoURI := getEnv("MONGODB_URI", "memory://")
	dbName := getEnv("DB_NAME", "dandiya_db")
	jwtSecret := getEnv("JWT_SECRET", "dandiya-navratri-e2ee-jwt-super-secret-key-2026")
	uploadDir := getEnv("UPLOAD_DIR", "./uploads")
	allowedOrigin := getEnv("ALLOWED_ORIGIN", "http://localhost:5173")
	
	maxUploadMB, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_MB", "5"), 10, 64)
	if maxUploadMB <= 0 {
		maxUploadMB = 5
	}

	log.Printf("[Config] Loaded: Port=%s, DB=%s (URI scheme=%s), UploadDir=%s", port, dbName, mongoURI, uploadDir)

	return &Config{
		Port:          port,
		MongoURI:      mongoURI,
		DBName:        dbName,
		JWTSecret:     jwtSecret,
		UploadDir:     uploadDir,
		AllowedOrigin: allowedOrigin,
		MaxUploadMB:   maxUploadMB,
	}
}

func getEnv(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}
