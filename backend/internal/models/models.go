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
	ID                string    `json:"id" bson:"_id"`
	ConversationID    string    `json:"conversationId" bson:"conversation_id"`
	SenderID          string    `json:"senderId" bson:"sender_id"`
	RecipientID       string    `json:"recipientId" bson:"recipient_id"`
	Ciphertext        string    `json:"ciphertext" bson:"ciphertext"`
	IV                string    `json:"iv" bson:"iv"`
	EphemeralPubKey   string    `json:"ephemeralPubKey" bson:"ephemeral_pub_key"` // Sender's ECDH public key (JWK or base64) for forward secrecy
	SequenceNumber    int64     `json:"sequenceNumber" bson:"sequence_number"`
	CreatedAt         time.Time `json:"createdAt" bson:"created_at"`
	DeliveredAt       *time.Time`json:"deliveredAt,omitempty" bson:"delivered_at,omitempty"`
	ReadAt            *time.Time`json:"readAt,omitempty" bson:"read_at,omitempty"`
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
