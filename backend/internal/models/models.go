package models

import (
	"time"
)

type UserStatus string

const (
	UserStatusActive    UserStatus = "ACTIVE"
	UserStatusSuspended UserStatus = "SUSPENDED"
)

type User struct {
	ID           string     `json:"id" bson:"_id"`
	Email        string     `json:"email" bson:"email"`
	PasswordHash string     `json:"-" bson:"password_hash"`
	Status       UserStatus `json:"status" bson:"status"`
	Role         string     `json:"role" bson:"role"` // "admin" or "user"
	IsDemo       bool       `json:"isDemo" bson:"is_demo"`
	CreatedAt    time.Time  `json:"createdAt" bson:"created_at"`
	UpdatedAt    time.Time  `json:"updatedAt" bson:"updated_at"`
}

type DanceLevel string

const (
	DanceLevelBeginner     DanceLevel = "Beginner"
	DanceLevelIntermediate DanceLevel = "Intermediate"
	DanceLevelPro          DanceLevel = "Pro"
)

type LookingFor string

const (
	LookingForPartner LookingFor = "Partner"
	LookingForFriends LookingFor = "Friends"
	LookingForGroup   LookingFor = "Group"
)

type Profile struct {
	ID         string     `json:"id" bson:"_id"`
	UserID     string     `json:"userId" bson:"user_id"`
	FirstName  string     `json:"firstName" bson:"first_name"`
	LastName   string     `json:"lastName,omitempty" bson:"last_name,omitempty"`
	Age        int        `json:"age" bson:"age"`
	City       string     `json:"city" bson:"city"`
	Sex        string     `json:"sex" bson:"sex"` // "F", "M", "Other"
	DanceLevel DanceLevel `json:"danceLevel" bson:"dance_level"`
	LookingFor LookingFor `json:"lookingFor" bson:"looking_for"`
	Bio        string     `json:"bio" bson:"bio"`
	PhotoURL   string     `json:"photoUrl" bson:"photo_url"`
	IsDemo     bool       `json:"isDemo" bson:"is_demo"`
	CreatedAt  time.Time  `json:"createdAt" bson:"created_at"`
	UpdatedAt  time.Time  `json:"updatedAt" bson:"updated_at"`
}

type RequestStatus string

const (
	RequestStatusPending  RequestStatus = "REQUESTED"
	RequestStatusAccepted RequestStatus = "ACCEPTED"
	RequestStatusDeclined RequestStatus = "DECLINED"
)

type ConnectionRequest struct {
	ID         string        `json:"id" bson:"_id"`
	FromUserID string        `json:"fromUserId" bson:"from_user_id"`
	ToUserID   string        `json:"toUserId" bson:"to_user_id"`
	Status     RequestStatus `json:"status" bson:"status"`
	CreatedAt  time.Time     `json:"createdAt" bson:"created_at"`
	UpdatedAt  time.Time     `json:"updatedAt" bson:"updated_at"`
	// Joined/hydrated view
	FromProfile *Profile `json:"fromProfile,omitempty" bson:"-"`
	ToProfile   *Profile `json:"toProfile,omitempty" bson:"-"`
}

type MatchStatus string

const (
	MatchStatusActive   MatchStatus = "ACTIVE"
	MatchStatusUnmatch  MatchStatus = "UNMATCHED"
	MatchStatusBlocked  MatchStatus = "BLOCKED"
)

type Match struct {
	ID             string      `json:"id" bson:"_id"`
	ParticipantIDs []string    `json:"participantIds" bson:"participant_ids"`
	Status         MatchStatus `json:"status" bson:"status"`
	CreatedAt      time.Time   `json:"createdAt" bson:"created_at"`
	UpdatedAt      time.Time   `json:"updatedAt" bson:"updated_at"`
	// Hydrated other user profile
	OtherProfile   *Profile    `json:"otherProfile,omitempty" bson:"-"`
	ConversationID string      `json:"conversationId,omitempty" bson:"-"`
}

type Conversation struct {
	ID             string    `json:"id" bson:"_id"`
	MatchID        string    `json:"matchId" bson:"match_id"`
	ParticipantIDs []string  `json:"participantIds" bson:"participant_ids"`
	CreatedAt      time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" bson:"updated_at"`
	LastMessageAt  time.Time `json:"lastMessageAt" bson:"last_message_at"`
}

// MessageEnvelope stores ONLY opaque encrypted payloads. Plaintext is NEVER stored or handled by backend.
type MessageEnvelope struct {
	ID                string     `json:"id" bson:"_id"`
	ConversationID    string     `json:"conversationId" bson:"conversation_id"`
	SenderID          string     `json:"senderId" bson:"sender_id"`
	RecipientID       string     `json:"recipientId" bson:"recipient_id"`
	Ciphertext        string     `json:"ciphertext" bson:"ciphertext"`
	IV                string     `json:"iv" bson:"iv"`
	EphemeralPubKey   string     `json:"ephemeralPubKey" bson:"ephemeral_pub_key"` // Sender's ECDH public key (JWK or base64)
	SequenceNumber    int64      `json:"sequenceNumber" bson:"sequence_number"`
	CreatedAt         time.Time  `json:"createdAt" bson:"created_at"`
	DeliveredAt       *time.Time `json:"deliveredAt,omitempty" bson:"delivered_at,omitempty"`
	ReadAt            *time.Time `json:"readAt,omitempty" bson:"read_at,omitempty"`
}

// KeyBundle stores public identity cryptographic keys for E2EE session setup.
// Private keys are NEVER stored on backend.
type KeyBundle struct {
	ID                string    `json:"id" bson:"_id"`
	UserID            string    `json:"userId" bson:"user_id"`
	IdentityPublicKey string    `json:"identityPublicKey" bson:"identity_public_key"` // JWK string
	CreatedAt         time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt         time.Time `json:"updatedAt" bson:"updated_at"`
}

// EncryptedKeyBackup stores zero-knowledge client-encrypted identity private key envelopes.
// The backend NEVER possesses the decryption key, passphrase, or plaintext key material.
type EncryptedKeyBackup struct {
	ID              string    `json:"id" bson:"_id"`
	UserID          string    `json:"userId" bson:"user_id"`
	EncryptedKeyJWK string    `json:"encryptedKeyJWK" bson:"encrypted_key_jwk"` // AES-256-GCM ciphertext of private key JWK
	IV              string    `json:"iv" bson:"iv"`                             // Base64 12-byte initialization vector
	Salt            string    `json:"salt" bson:"salt"`                         // Base64 salt for PBKDF2/Argon2id derivation
	Iterations      int       `json:"iterations" bson:"iterations"`             // Key derivation iterations
	CreatedAt       time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt       time.Time `json:"updatedAt" bson:"updated_at"`
}

type Block struct {
	ID        string    `json:"id" bson:"_id"`
	BlockerID string    `json:"blockerId" bson:"blocker_id"`
	BlockedID string    `json:"blockedId" bson:"blocked_id"`
	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
}

type Report struct {
	ID             string    `json:"id" bson:"_id"`
	ReporterID     string    `json:"reporterId" bson:"reporter_id"`
	ReportedUserID string    `json:"reportedUserId" bson:"reported_user_id"`
	Reason         string    `json:"reason" bson:"reason"`
	Details        string    `json:"details" bson:"details"`
	CreatedAt      time.Time `json:"createdAt" bson:"created_at"`
}

// Analytics Models
type AnalyticsEventType string

const (
	AnalyticsPageView        AnalyticsEventType = "page_view"
	AnalyticsSignupStarted   AnalyticsEventType = "signup_started"
	AnalyticsSignupCompleted AnalyticsEventType = "signup_completed"
	AnalyticsProfileComplete AnalyticsEventType = "profile_completed"
	AnalyticsRequestSent     AnalyticsEventType = "request_sent"
	AnalyticsMatchCreated    AnalyticsEventType = "match_created"
	AnalyticsFirstMsgSent    AnalyticsEventType = "first_message_sent"
)

type AnalyticsEvent struct {
	ID        string             `json:"id" bson:"_id"`
	VisitorID string             `json:"visitorId" bson:"visitor_id"`
	UserID    string             `json:"userId,omitempty" bson:"user_id,omitempty"`
	Type      AnalyticsEventType `json:"type" bson:"type"`
	Path      string             `json:"path" bson:"path"`
	Referrer  string             `json:"referrer,omitempty" bson:"referrer,omitempty"`
	UTMSource string             `json:"utmSource,omitempty" bson:"utm_source,omitempty"`
	UTMMedium string             `json:"utmMedium,omitempty" bson:"utm_medium,omitempty"`
	UTMCamp   string             `json:"utmCampaign,omitempty" bson:"utm_campaign,omitempty"`
	IsDemo    bool               `json:"isDemo" bson:"is_demo"` // True if triggered by seeded demo account; filtered out from real metrics
	CreatedAt time.Time          `json:"createdAt" bson:"created_at"`
}

type AnalyticsOverview struct {
	TotalUniqueVisitors int64 `json:"totalUniqueVisitors"`
	TotalPageViews      int64 `json:"totalPageViews"`
	RegisteredUsers     int64 `json:"registeredUsers"`
	CompletedProfiles   int64 `json:"completedProfiles"`
	DailyActiveUsers    int64 `json:"dailyActiveUsers"`
	WeeklyActiveUsers   int64 `json:"weeklyActiveUsers"`
	ReturningVisitors   int64 `json:"returningVisitors"`
	RealMatchesCreated  int64 `json:"realMatchesCreated"`
	RealConversations   int64 `json:"realConversations"`
}

type FunnelStep struct {
	Name           string  `json:"name"`
	Count          int64   `json:"count"`
	ConversionRate float64 `json:"conversionRate"` // % relative to top of funnel or previous step
}

type AnalyticsFunnel struct {
	Steps []FunnelStep `json:"steps"`
}

type TimeseriesPoint struct {
	Date        string `json:"date"` // YYYY-MM-DD
	Visitors    int64  `json:"visitors"`
	PageViews   int64  `json:"pageViews"`
	Signups     int64  `json:"signups"`
	ActiveUsers int64  `json:"activeUsers"`
}

type TrafficItem struct {
	Key   string `json:"key"`
	Count int64  `json:"count"`
}

type AnalyticsTraffic struct {
	TopRoutes   []TrafficItem `json:"topRoutes"`
	UTMSources  []TrafficItem `json:"utmSources"`
	Referrers   []TrafficItem `json:"referrers"`
}
