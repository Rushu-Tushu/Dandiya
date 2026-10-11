package database

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/models"
)

type MemoryRepository struct {
	mu            sync.RWMutex
	users         map[string]*models.User              // id -> user
	usersByEmail  map[string]string                    // email -> id
	profiles      map[string]*models.Profile           // userId -> profile
	requests      map[string]*models.ConnectionRequest // id -> request
	matches       map[string]*models.Match             // id -> match
	conversations map[string]*models.Conversation      // id -> conv
	messages      map[string][]*models.MessageEnvelope // convId -> []msg
	keyBundles    map[string]*models.KeyBundle         // userId -> bundle
	blocks        map[string]map[string]bool           // blockerId -> blockedId -> true
	reports       []*models.Report
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		users:         make(map[string]*models.User),
		usersByEmail:  make(map[string]string),
		profiles:      make(map[string]*models.Profile),
		requests:      make(map[string]*models.ConnectionRequest),
		matches:       make(map[string]*models.Match),
		conversations: make(map[string]*models.Conversation),
		messages:      make(map[string][]*models.MessageEnvelope),
		keyBundles:    make(map[string]*models.KeyBundle),
		blocks:        make(map[string]map[string]bool),
		reports:       make([]*models.Report, 0),
	}
}

// Users
func (m *MemoryRepository) CreateUser(ctx context.Context, user *models.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	emailKey := strings.ToLower(user.Email)
	if _, exists := m.usersByEmail[emailKey]; exists {
		return ErrAlreadyExists
	}

	m.users[user.ID] = user
	m.usersByEmail[emailKey] = user.ID
	return nil
}

func (m *MemoryRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	id, exists := m.usersByEmail[strings.ToLower(email)]
	if !exists {
		return nil, ErrNotFound
	}
	return m.users[id], nil
}

func (m *MemoryRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	user, exists := m.users[id]
	if !exists {
		return nil, ErrNotFound
	}
	return user, nil
}

// Profiles
func (m *MemoryRepository) CreateProfile(ctx context.Context, profile *models.Profile) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.profiles[profile.UserID] = profile
	return nil
}

func (m *MemoryRepository) GetProfileByUserID(ctx context.Context, userID string) (*models.Profile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	profile, exists := m.profiles[userID]
	if !exists {
		return nil, ErrNotFound
	}
	return profile, nil
}

func (m *MemoryRepository) UpdateProfile(ctx context.Context, profile *models.Profile) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.profiles[profile.UserID]; !exists {
		return ErrNotFound
	}
	profile.UpdatedAt = time.Now()
	m.profiles[profile.UserID] = profile
	return nil
}

func (m *MemoryRepository) DiscoverProfiles(ctx context.Context, currentUserID string, city string, lookingFor models.LookingFor, danceLevel models.DanceLevel, minAge, maxAge int, limit, offset int) ([]*models.Profile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Get blocked IDs
	blockedMap := make(map[string]bool)
	if blocks, ok := m.blocks[currentUserID]; ok {
		for id := range blocks {
			blockedMap[id] = true
		}
	}
	// Also reverse blocks
	for blockerID, blockedList := range m.blocks {
		if blockedList[currentUserID] {
			blockedMap[blockerID] = true
		}
	}

	var results []*models.Profile
	for _, p := range m.profiles {
		if p.UserID == currentUserID {
			continue // Don't discover self
		}
		if blockedMap[p.UserID] {
			continue // Skip blocked users
		}

		// Filter city (case-insensitive substring or exact match if specified)
		if city != "" && !strings.EqualFold(p.City, city) {
			continue
		}

		// Filter LookingFor if specified
		if lookingFor != "" && p.LookingFor != lookingFor {
			continue
		}

		// Filter DanceLevel if specified
		if danceLevel != "" && p.DanceLevel != danceLevel {
			continue
		}

		// Filter Age
		if minAge > 0 && p.Age < minAge {
			continue
		}
		if maxAge > 0 && p.Age > maxAge {
			continue
		}

		results = append(results, p)
	}

	// Simple pagination
	total := len(results)
	if offset >= total {
		return []*models.Profile{}, nil
	}
	end := offset + limit
	if limit <= 0 || end > total {
		end = total
	}

	return results[offset:end], nil
}

// Requests
func (m *MemoryRepository) CreateRequest(ctx context.Context, req *models.ConnectionRequest) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.requests[req.ID] = req
	return nil
}

func (m *MemoryRepository) GetRequestByID(ctx context.Context, id string) (*models.ConnectionRequest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	req, exists := m.requests[id]
	if !exists {
		return nil, ErrNotFound
	}
	return req, nil
}

func (m *MemoryRepository) GetActiveRequestBetween(ctx context.Context, userA, userB string) (*models.ConnectionRequest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, r := range m.requests {
		if (r.FromUserID == userA && r.ToUserID == userB) || (r.FromUserID == userB && r.ToUserID == userA) {
			if r.Status == models.RequestStatusPending || r.Status == models.RequestStatusAccepted {
				return r, nil
			}
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) UpdateRequestStatus(ctx context.Context, id string, status models.RequestStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	req, exists := m.requests[id]
	if !exists {
		return ErrNotFound
	}
	req.Status = status
	req.UpdatedAt = time.Now()
	return nil
}

func (m *MemoryRepository) GetIncomingRequests(ctx context.Context, userID string) ([]*models.ConnectionRequest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []*models.ConnectionRequest
	for _, r := range m.requests {
		if r.ToUserID == userID && r.Status == models.RequestStatusPending {
			// Attach FromProfile
			clone := *r
			if p, ok := m.profiles[r.FromUserID]; ok {
				clone.FromProfile = p
			}
			list = append(list, &clone)
		}
	}
	return list, nil
}

func (m *MemoryRepository) GetOutgoingRequests(ctx context.Context, userID string) ([]*models.ConnectionRequest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []*models.ConnectionRequest
	for _, r := range m.requests {
		if r.FromUserID == userID {
			clone := *r
			if p, ok := m.profiles[r.ToUserID]; ok {
				clone.ToProfile = p
			}
			list = append(list, &clone)
		}
	}
	return list, nil
}

// Matches
func (m *MemoryRepository) CreateMatch(ctx context.Context, match *models.Match) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.matches[match.ID] = match
	return nil
}

func (m *MemoryRepository) GetMatchByID(ctx context.Context, id string) (*models.Match, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	match, exists := m.matches[id]
	if !exists {
		return nil, ErrNotFound
	}
	return match, nil
}

func (m *MemoryRepository) GetMatchBetweenUsers(ctx context.Context, userA, userB string) (*models.Match, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, match := range m.matches {
		if match.Status != models.MatchStatusActive {
			continue
		}
		if (match.ParticipantIDs[0] == userA && match.ParticipantIDs[1] == userB) ||
			(match.ParticipantIDs[0] == userB && match.ParticipantIDs[1] == userA) {
			return match, nil
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) GetMatchesForUser(ctx context.Context, userID string) ([]*models.Match, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []*models.Match
	for _, match := range m.matches {
		if match.Status != models.MatchStatusActive {
			continue
		}
		if match.ParticipantIDs[0] == userID || match.ParticipantIDs[1] == userID {
			clone := *match
			otherID := match.ParticipantIDs[0]
			if otherID == userID {
				otherID = match.ParticipantIDs[1]
			}
			if p, ok := m.profiles[otherID]; ok {
				clone.OtherProfile = p
			}
			// Find conversation if any
			for _, conv := range m.conversations {
				if conv.MatchID == match.ID {
					clone.ConversationID = conv.ID
					break
				}
			}
			list = append(list, &clone)
		}
	}
	return list, nil
}

func (m *MemoryRepository) UpdateMatchStatus(ctx context.Context, matchID string, status models.MatchStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	match, exists := m.matches[matchID]
	if !exists {
		return ErrNotFound
	}
	match.Status = status
	match.UpdatedAt = time.Now()
	return nil
}

// Conversations
func (m *MemoryRepository) CreateConversation(ctx context.Context, conv *models.Conversation) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.conversations[conv.ID] = conv
	return nil
}

func (m *MemoryRepository) GetConversationByID(ctx context.Context, id string) (*models.Conversation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	conv, exists := m.conversations[id]
	if !exists {
		return nil, ErrNotFound
	}
	return conv, nil
}

func (m *MemoryRepository) GetConversationByMatchID(ctx context.Context, matchID string) (*models.Conversation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, conv := range m.conversations {
		if conv.MatchID == matchID {
			return conv, nil
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) GetConversationsForUser(ctx context.Context, userID string) ([]*models.Conversation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []*models.Conversation
	for _, conv := range m.conversations {
		if conv.ParticipantIDs[0] == userID || conv.ParticipantIDs[1] == userID {
			list = append(list, conv)
		}
	}
	return list, nil
}

func (m *MemoryRepository) UpdateConversationLastMessage(ctx context.Context, convID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	conv, exists := m.conversations[convID]
	if !exists {
		return ErrNotFound
	}
	now := time.Now()
	conv.LastMessageAt = now
	conv.UpdatedAt = now
	return nil
}

// Messages
func (m *MemoryRepository) SaveMessage(ctx context.Context, msg *models.MessageEnvelope) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.messages[msg.ConversationID] = append(m.messages[msg.ConversationID], msg)
	return nil
}

func (m *MemoryRepository) GetMessages(ctx context.Context, convID string, limit, offset int) ([]*models.MessageEnvelope, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	list := m.messages[convID]
	total := len(list)
	if offset >= total {
		return []*models.MessageEnvelope{}, nil
	}
	end := offset + limit
	if limit <= 0 || end > total {
		end = total
	}
	return list[offset:end], nil
}

// Key Bundles
func (m *MemoryRepository) UpsertKeyBundle(ctx context.Context, bundle *models.KeyBundle) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.keyBundles[bundle.UserID] = bundle
	return nil
}

func (m *MemoryRepository) GetKeyBundle(ctx context.Context, userID string) (*models.KeyBundle, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	bundle, exists := m.keyBundles[userID]
	if !exists {
		return nil, ErrNotFound
	}
	return bundle, nil
}

// Blocks & Reports
func (m *MemoryRepository) CreateBlock(ctx context.Context, block *models.Block) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.blocks[block.BlockerID]; !ok {
		m.blocks[block.BlockerID] = make(map[string]bool)
	}
	m.blocks[block.BlockerID][block.BlockedID] = true
	return nil
}

func (m *MemoryRepository) DeleteBlock(ctx context.Context, blockerID, blockedID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if b, ok := m.blocks[blockerID]; ok {
		delete(b, blockedID)
	}
	return nil
}

func (m *MemoryRepository) IsBlocked(ctx context.Context, userA, userB string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if b, ok := m.blocks[userA]; ok && b[userB] {
		return true, nil
	}
	if b, ok := m.blocks[userB]; ok && b[userA] {
		return true, nil
	}
	return false, nil
}

func (m *MemoryRepository) GetBlockedUserIDs(ctx context.Context, userID string) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []string
	if b, ok := m.blocks[userID]; ok {
		for id := range b {
			list = append(list, id)
		}
	}
	return list, nil
}

func (m *MemoryRepository) CreateReport(ctx context.Context, report *models.Report) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.reports = append(m.reports, report)
	return nil
}
