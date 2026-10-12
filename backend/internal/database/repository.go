package database

import (
	"context"
	"errors"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/models"
)

var (
	ErrNotFound      = errors.New("record not found")
	ErrAlreadyExists = errors.New("record already exists")
	ErrUnauthorized  = errors.New("unauthorized operation")
	ErrSelfAction    = errors.New("cannot perform this action on yourself")
)

type Repository interface {
	// Users
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	UpdateUserRole(ctx context.Context, userID, role string) error

	// Profiles
	CreateProfile(ctx context.Context, profile *models.Profile) error
	GetProfileByUserID(ctx context.Context, userID string) (*models.Profile, error)
	UpdateProfile(ctx context.Context, profile *models.Profile) error
	DiscoverProfiles(ctx context.Context, currentUserID string, city string, lookingFor models.LookingFor, danceLevel models.DanceLevel, minAge, maxAge int, limit, offset int) ([]*models.Profile, error)

	// Requests
	CreateRequest(ctx context.Context, req *models.ConnectionRequest) error
	GetRequestByID(ctx context.Context, id string) (*models.ConnectionRequest, error)
	GetActiveRequestBetween(ctx context.Context, userA, userB string) (*models.ConnectionRequest, error)
	UpdateRequestStatus(ctx context.Context, id string, status models.RequestStatus) error
	GetIncomingRequests(ctx context.Context, userID string) ([]*models.ConnectionRequest, error)
	GetOutgoingRequests(ctx context.Context, userID string) ([]*models.ConnectionRequest, error)

	// Matches
	CreateMatch(ctx context.Context, match *models.Match) error
	GetMatchByID(ctx context.Context, id string) (*models.Match, error)
	GetMatchBetweenUsers(ctx context.Context, userA, userB string) (*models.Match, error)
	GetMatchesForUser(ctx context.Context, userID string) ([]*models.Match, error)
	UpdateMatchStatus(ctx context.Context, matchID string, status models.MatchStatus) error

	// Conversations
	CreateConversation(ctx context.Context, conv *models.Conversation) error
	GetConversationByID(ctx context.Context, id string) (*models.Conversation, error)
	GetConversationByMatchID(ctx context.Context, matchID string) (*models.Conversation, error)
	GetConversationsForUser(ctx context.Context, userID string) ([]*models.Conversation, error)
	UpdateConversationLastMessage(ctx context.Context, convID string) error

	// Messages (Opaque Encrypted Envelopes)
	SaveMessage(ctx context.Context, msg *models.MessageEnvelope) error
	GetMessages(ctx context.Context, convID string, limit, offset int) ([]*models.MessageEnvelope, error)

	// Key Bundles & Zero-Knowledge Encrypted Key Backups
	UpsertKeyBundle(ctx context.Context, bundle *models.KeyBundle) error
	GetKeyBundle(ctx context.Context, userID string) (*models.KeyBundle, error)
	SaveEncryptedKeyBackup(ctx context.Context, backup *models.EncryptedKeyBackup) error
	GetEncryptedKeyBackup(ctx context.Context, userID string) (*models.EncryptedKeyBackup, error)

	// Safety: Blocks & Reports
	CreateBlock(ctx context.Context, block *models.Block) error
	DeleteBlock(ctx context.Context, blockerID, blockedID string) error
	IsBlocked(ctx context.Context, userA, userB string) (bool, error)
	GetBlockedUserIDs(ctx context.Context, userID string) ([]string, error)
	CreateReport(ctx context.Context, report *models.Report) error

	// Admin Analytics & Metrics
	TrackAnalyticsEvent(ctx context.Context, event *models.AnalyticsEvent) error
	GetAnalyticsOverview(ctx context.Context, from, to time.Time) (*models.AnalyticsOverview, error)
	GetAnalyticsFunnel(ctx context.Context, from, to time.Time) (*models.AnalyticsFunnel, error)
	GetAnalyticsTimeseries(ctx context.Context, from, to time.Time) ([]*models.TimeseriesPoint, error)
	GetAnalyticsTraffic(ctx context.Context, from, to time.Time) (*models.AnalyticsTraffic, error)
}
