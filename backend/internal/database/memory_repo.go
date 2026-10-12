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
	keyBundles      map[string]*models.KeyBundle         // userId -> bundle
	keyBackups      map[string]*models.EncryptedKeyBackup // userId -> backup
	blocks          map[string]map[string]bool           // blockerId -> blockedId -> true
	reports         []*models.Report
	analyticsEvents []*models.AnalyticsEvent
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		users:           make(map[string]*models.User),
		usersByEmail:    make(map[string]string),
		profiles:        make(map[string]*models.Profile),
		requests:        make(map[string]*models.ConnectionRequest),
		matches:         make(map[string]*models.Match),
		conversations:   make(map[string]*models.Conversation),
		messages:        make(map[string][]*models.MessageEnvelope),
		keyBundles:      make(map[string]*models.KeyBundle),
		keyBackups:      make(map[string]*models.EncryptedKeyBackup),
		blocks:          make(map[string]map[string]bool),
		reports:         make([]*models.Report, 0),
		analyticsEvents: make([]*models.AnalyticsEvent, 0),
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

	// Idempotency check: if message with this ID already exists, do not duplicate!
	for _, existing := range m.messages[msg.ConversationID] {
		if existing.ID == msg.ID {
			return nil // Idempotently succeeded
		}
	}

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

// Key Bundles & Encrypted Key Backups
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

func (m *MemoryRepository) SaveEncryptedKeyBackup(ctx context.Context, backup *models.EncryptedKeyBackup) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	backup.UpdatedAt = time.Now()
	m.keyBackups[backup.UserID] = backup
	return nil
}

func (m *MemoryRepository) GetEncryptedKeyBackup(ctx context.Context, userID string) (*models.EncryptedKeyBackup, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	backup, exists := m.keyBackups[userID]
	if !exists {
		return nil, ErrNotFound
	}
	return backup, nil
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

// Analytics Methods
func (m *MemoryRepository) TrackAnalyticsEvent(ctx context.Context, event *models.AnalyticsEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}
	m.analyticsEvents = append(m.analyticsEvents, event)
	return nil
}

func (m *MemoryRepository) GetAnalyticsOverview(ctx context.Context, from, to time.Time) (*models.AnalyticsOverview, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	now := time.Now()
	dayAgo := now.Add(-24 * time.Hour)
	weekAgo := now.Add(-7 * 24 * time.Hour)

	uniqueVisitors := make(map[string]bool)
	visitorDays := make(map[string]map[string]bool) // visitorId -> date -> true
	dauMap := make(map[string]bool)
	wauMap := make(map[string]bool)
	var totalPageViews int64

	for _, ev := range m.analyticsEvents {
		if ev.IsDemo {
			continue // Exclude demo activity from real metrics
		}
		if !from.IsZero() && ev.CreatedAt.Before(from) {
			continue
		}
		if !to.IsZero() && ev.CreatedAt.After(to) {
			continue
		}

		if ev.VisitorID != "" {
			uniqueVisitors[ev.VisitorID] = true
			dayStr := ev.CreatedAt.Format("2006-01-02")
			if visitorDays[ev.VisitorID] == nil {
				visitorDays[ev.VisitorID] = make(map[string]bool)
			}
			visitorDays[ev.VisitorID][dayStr] = true
		}

		if ev.Type == models.AnalyticsPageView {
			totalPageViews++
		}

		if ev.UserID != "" && !ev.IsDemo {
			if ev.CreatedAt.After(dayAgo) {
				dauMap[ev.UserID] = true
			}
			if ev.CreatedAt.After(weekAgo) {
				wauMap[ev.UserID] = true
			}
		}
	}

	var returningVisitors int64
	for _, days := range visitorDays {
		if len(days) > 1 {
			returningVisitors++
		}
	}

	var registeredUsers int64
	for _, u := range m.users {
		if !u.IsDemo {
			registeredUsers++
		}
	}

	var completedProfiles int64
	for _, p := range m.profiles {
		if !p.IsDemo && p.FirstName != "" && p.City != "" {
			completedProfiles++
		}
	}

	var realMatches int64
	for _, match := range m.matches {
		isReal := true
		for _, pid := range match.ParticipantIDs {
			if u, exists := m.users[pid]; exists && u.IsDemo {
				isReal = false
				break
			}
		}
		if isReal {
			realMatches++
		}
	}

	var realConvs int64
	for _, conv := range m.conversations {
		isReal := true
		for _, pid := range conv.ParticipantIDs {
			if u, exists := m.users[pid]; exists && u.IsDemo {
				isReal = false
				break
			}
		}
		if isReal && len(m.messages[conv.ID]) > 0 {
			realConvs++
		}
	}

	return &models.AnalyticsOverview{
		TotalUniqueVisitors: int64(len(uniqueVisitors)),
		TotalPageViews:      totalPageViews,
		RegisteredUsers:     registeredUsers,
		CompletedProfiles:   completedProfiles,
		DailyActiveUsers:    int64(len(dauMap)),
		WeeklyActiveUsers:   int64(len(wauMap)),
		ReturningVisitors:   returningVisitors,
		RealMatchesCreated:  realMatches,
		RealConversations:   realConvs,
	}, nil
}

func (m *MemoryRepository) GetAnalyticsFunnel(ctx context.Context, from, to time.Time) (*models.AnalyticsFunnel, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	visitors := make(map[string]bool)
	signupStarted := make(map[string]bool)
	signupCompleted := make(map[string]bool)
	profileCompleted := make(map[string]bool)
	requestSent := make(map[string]bool)
	matchCreated := make(map[string]bool)
	firstMsgSent := make(map[string]bool)

	for _, ev := range m.analyticsEvents {
		if ev.IsDemo {
			continue
		}
		if !from.IsZero() && ev.CreatedAt.Before(from) {
			continue
		}
		if !to.IsZero() && ev.CreatedAt.After(to) {
			continue
		}

		key := ev.VisitorID
		if key == "" {
			key = ev.UserID
		}
		if key == "" {
			continue
		}

		visitors[key] = true
		switch ev.Type {
		case models.AnalyticsSignupStarted:
			signupStarted[key] = true
		case models.AnalyticsSignupCompleted:
			signupCompleted[key] = true
		case models.AnalyticsProfileComplete:
			profileCompleted[key] = true
		case models.AnalyticsRequestSent:
			requestSent[key] = true
		case models.AnalyticsMatchCreated:
			matchCreated[key] = true
		case models.AnalyticsFirstMsgSent:
			firstMsgSent[key] = true
		}
	}

	// Also fold in real database records if analytics event collection started after registration
	for _, u := range m.users {
		if !u.IsDemo {
			signupCompleted[u.ID] = true
			visitors[u.ID] = true
		}
	}
	for _, p := range m.profiles {
		if !p.IsDemo && p.FirstName != "" {
			profileCompleted[p.UserID] = true
		}
	}
	for _, req := range m.requests {
		if u, exists := m.users[req.FromUserID]; exists && !u.IsDemo {
			requestSent[req.FromUserID] = true
		}
	}
	for _, match := range m.matches {
		for _, pid := range match.ParticipantIDs {
			if u, exists := m.users[pid]; exists && !u.IsDemo {
				matchCreated[pid] = true
			}
		}
	}
	for _, conv := range m.conversations {
		if len(m.messages[conv.ID]) > 0 {
			for _, pid := range conv.ParticipantIDs {
				if u, exists := m.users[pid]; exists && !u.IsDemo {
					firstMsgSent[pid] = true
				}
			}
		}
	}

	totalVisitors := int64(len(visitors))
	calcRate := func(count int64) float64 {
		if totalVisitors == 0 {
			return 0
		}
		return float64(count) / float64(totalVisitors) * 100.0
	}

	c1 := totalVisitors
	c2 := int64(len(signupStarted))
	c3 := int64(len(signupCompleted))
	c4 := int64(len(profileCompleted))
	c5 := int64(len(requestSent))
	c6 := int64(len(matchCreated))
	c7 := int64(len(firstMsgSent))

	steps := []models.FunnelStep{
		{Name: "Visitors", Count: c1, ConversionRate: 100.0},
		{Name: "Signup Started", Count: c2, ConversionRate: calcRate(c2)},
		{Name: "Signup Completed", Count: c3, ConversionRate: calcRate(c3)},
		{Name: "Profile Completed", Count: c4, ConversionRate: calcRate(c4)},
		{Name: "Dandiya Request Sent", Count: c5, ConversionRate: calcRate(c5)},
		{Name: "Match Created", Count: c6, ConversionRate: calcRate(c6)},
		{Name: "First Message Sent", Count: c7, ConversionRate: calcRate(c7)},
	}

	return &models.AnalyticsFunnel{Steps: steps}, nil
}

func (m *MemoryRepository) GetAnalyticsTimeseries(ctx context.Context, from, to time.Time) ([]*models.TimeseriesPoint, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if from.IsZero() {
		from = time.Now().Add(-14 * 24 * time.Hour)
	}
	if to.IsZero() {
		to = time.Now()
	}

	dayMap := make(map[string]*models.TimeseriesPoint)
	visitorMap := make(map[string]map[string]bool)
	activeUserMap := make(map[string]map[string]bool)

	// Pre-populate days
	for d := from; !d.After(to); d = d.Add(24 * time.Hour) {
		dateStr := d.Format("2006-01-02")
		dayMap[dateStr] = &models.TimeseriesPoint{Date: dateStr}
		visitorMap[dateStr] = make(map[string]bool)
		activeUserMap[dateStr] = make(map[string]bool)
	}

	for _, ev := range m.analyticsEvents {
		if ev.IsDemo || ev.CreatedAt.Before(from) || ev.CreatedAt.After(to) {
			continue
		}
		dateStr := ev.CreatedAt.Format("2006-01-02")
		pt, exists := dayMap[dateStr]
		if !exists {
			continue
		}

		if ev.VisitorID != "" {
			visitorMap[dateStr][ev.VisitorID] = true
		}
		if ev.Type == models.AnalyticsPageView {
			pt.PageViews++
		}
		if ev.Type == models.AnalyticsSignupCompleted {
			pt.Signups++
		}
		if ev.UserID != "" {
			activeUserMap[dateStr][ev.UserID] = true
		}
	}

	result := make([]*models.TimeseriesPoint, 0, len(dayMap))
	for d := from; !d.After(to); d = d.Add(24 * time.Hour) {
		dateStr := d.Format("2006-01-02")
		if pt, exists := dayMap[dateStr]; exists {
			pt.Visitors = int64(len(visitorMap[dateStr]))
			pt.ActiveUsers = int64(len(activeUserMap[dateStr]))
			result = append(result, pt)
		}
	}

	return result, nil
}

func (m *MemoryRepository) GetAnalyticsTraffic(ctx context.Context, from, to time.Time) (*models.AnalyticsTraffic, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	routeCounts := make(map[string]int64)
	utmCounts := make(map[string]int64)
	referrerCounts := make(map[string]int64)

	for _, ev := range m.analyticsEvents {
		if ev.IsDemo {
			continue
		}
		if !from.IsZero() && ev.CreatedAt.Before(from) {
			continue
		}
		if !to.IsZero() && ev.CreatedAt.After(to) {
			continue
		}

		if ev.Path != "" {
			routeCounts[ev.Path]++
		}
		if ev.UTMSource != "" {
			utmCounts[ev.UTMSource]++
		}
		if ev.Referrer != "" {
			referrerCounts[ev.Referrer]++
		}
	}

	toTrafficItems := func(m map[string]int64) []models.TrafficItem {
		list := make([]models.TrafficItem, 0, len(m))
		for k, v := range m {
			list = append(list, models.TrafficItem{Key: k, Count: v})
		}
		return list
	}

	return &models.AnalyticsTraffic{
		TopRoutes:  toTrafficItems(routeCounts),
		UTMSources: toTrafficItems(utmCounts),
		Referrers:  toTrafficItems(referrerCounts),
	}, nil
}
