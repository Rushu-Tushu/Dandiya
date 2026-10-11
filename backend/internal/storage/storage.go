package storage

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrInvalidFileType = errors.New("invalid file type. Allowed formats: JPEG, PNG, WEBP")
	ErrFileTooLarge    = errors.New("file size exceeds maximum allowed limit")
)

type StorageProvider interface {
	SaveFile(reader io.Reader, filename string, size int64) (string, error)
	DeleteFile(fileURL string) error
}

type LocalStorage struct {
	baseDir string
	baseURL string
	maxSize int64
}

func NewLocalStorage(baseDir, baseURL string, maxMB int64) (*LocalStorage, error) {
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload dir: %w", err)
	}
	return &LocalStorage{
		baseDir: baseDir,
		baseURL: strings.TrimRight(baseURL, "/"),
		maxSize: maxMB * 1024 * 1024,
	}, nil
}

func (s *LocalStorage) SaveFile(reader io.Reader, originalFilename string, size int64) (string, error) {
	if size > s.maxSize {
		return "", ErrFileTooLarge
	}

	// Read first 512 bytes for MIME and magic number sniffing
	buffer := make([]byte, 512)
	n, err := reader.Read(buffer)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("failed to read file header: %w", err)
	}

	mimeType := http.DetectContentType(buffer[:n])
	var ext string
	switch {
	case strings.HasPrefix(mimeType, "image/jpeg"):
		if !isJPEG(buffer[:n]) {
			return "", ErrInvalidFileType
		}
		ext = ".jpg"
	case strings.HasPrefix(mimeType, "image/png"):
		if !isPNG(buffer[:n]) {
			return "", ErrInvalidFileType
		}
		ext = ".png"
	case strings.HasPrefix(mimeType, "image/webp"):
		if !isWEBP(buffer[:n]) {
			return "", ErrInvalidFileType
		}
		ext = ".webp"
	default:
		return "", ErrInvalidFileType
	}

	// Generate safe UUID filename
	newFilename := fmt.Sprintf("avatar_%s%s", uuid.New().String(), ext)
	targetPath := filepath.Join(s.baseDir, newFilename)

	out, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return "", fmt.Errorf("failed to create file on disk: %w", err)
	}
	defer out.Close()

	// Write the sniffed bytes first
	if _, err := out.Write(buffer[:n]); err != nil {
		return "", err
	}

	// Stream remainder
	written, err := io.Copy(out, reader)
	if err != nil {
		return "", fmt.Errorf("failed to save file contents: %w", err)
	}

	if int64(n)+written > s.maxSize {
		_ = os.Remove(targetPath)
		return "", ErrFileTooLarge
	}

	return fmt.Sprintf("/uploads/%s", newFilename), nil
}

func (s *LocalStorage) DeleteFile(fileURL string) error {
	filename := filepath.Base(fileURL)
	targetPath := filepath.Join(s.baseDir, filename)
	return os.Remove(targetPath)
}

// Magic bytes validation
func isJPEG(buf []byte) bool {
	return len(buf) >= 3 && buf[0] == 0xFF && buf[1] == 0xD8 && buf[2] == 0xFF
}

func isPNG(buf []byte) bool {
	pngHeader := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	return len(buf) >= 8 && bytes.Equal(buf[:8], pngHeader)
}

func isWEBP(buf []byte) bool {
	return len(buf) >= 12 &&
		string(buf[:4]) == "RIFF" &&
		string(buf[8:12]) == "WEBP"
}
