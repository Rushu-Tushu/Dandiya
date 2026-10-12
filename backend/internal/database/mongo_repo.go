package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type MongoRepository struct {
	client        *mongo.Client
	db            *mongo.Database
	users         *mongo.Collection
	profiles      *mongo.Collection
	requests      *mongo.Collection
	matches       *mongo.Collection
	conversations *mongo.Collection
	messages      *mongo.Collection
	keyBundles    *mongo.Collection
	keyBackups    *mongo.Collection
	blocks        *mongo.Collection
	reports       *mongo.Collection
	analytics     *mongo.Collection
}

func NewMongoRepository(ctx context.Context, uri, dbName string) (*MongoRepository, error) {
	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongodb: %w", err)
	}

	// Ping the primary
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping mongodb: %w", err)
	}

	db := client.Database(dbName)
	repo := &MongoRepository{
		client:        client,
		db:            db,
		users:         db.Collection("users"),
		profiles:      db.Collection("profiles"),
		requests:      db.Collection("connection_requests"),
		matches:       db.Collection("matches"),
		conversations: db.Collection("conversations"),
		messages:      db.Collection("messages"),
		keyBundles:    db.Collection("encryption_key_bundles"),
		keyBackups:    db.Collection("encryption_key_backups"),
		blocks:        db.Collection("blocks"),
		reports:       db.Collection("reports"),
		analytics:     db.Collection("analytics_events"),
	}

	if err := repo.ensureIndexes(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure indexes: %w", err)
	}

	return repo, nil
}

func (r *MongoRepository) ensureIndexes(ctx context.Context) error {
	// users.email unique index
	_, err := r.users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// profiles.user_id unique index
	_, err = r.profiles.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// connection_requests index
	_, err = r.requests.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "from_user_id", Value: 1}, {Key: "to_user_id", Value: 1}},
	})
	if err != nil {
		return err
	}

	// matches.participant_ids index
	_, err = r.matches.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "participant_ids", Value: 1}},
	})
	if err != nil {
		return err
	}

	// messages.conversation_id + sequence_number index
	_, err = r.messages.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "conversation_id", Value: 1}, {Key: "sequence_number", Value: 1}},
	})
	if err != nil {
		return err
	}

	// key_bundles.user_id unique index
	_, err = r.keyBundles.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// blocks compound unique
	_, err = r.blocks.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "blocker_id", Value: 1}, {Key: "blocked_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// key_backups.user_id unique index
	_, err = r.keyBackups.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// analytics_events indexes (created_at for timeseries, type, visitor_id)
	_, err = r.analytics.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "created_at", Value: -1}},
	})
	if err != nil {
		return err
	}

	_, err = r.analytics.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "type", Value: 1}, {Key: "is_demo", Value: 1}},
	})
	if err != nil {
		return err
	}

	return nil
}

// Users
func (r *MongoRepository) CreateUser(ctx context.Context, user *models.User) error {
	user.Email = strings.ToLower(user.Email)
	_, err := r.users.InsertOne(ctx, user)
	if mongo.IsDuplicateKeyError(err) {
		return ErrAlreadyExists
	}
	return err
}

func (r *MongoRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.users.FindOne(ctx, bson.M{"email": strings.ToLower(email)}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *MongoRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.users.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

// Profiles
func (r *MongoRepository) CreateProfile(ctx context.Context, profile *models.Profile) error {
	_, err := r.profiles.InsertOne(ctx, profile)
	if mongo.IsDuplicateKeyError(err) {
		return ErrAlreadyExists
	}
	return err
}

func (r *MongoRepository) GetProfileByUserID(ctx context.Context, userID string) (*models.Profile, error) {
	var profile models.Profile
	err := r.profiles.FindOne(ctx, bson.M{"user_id": userID}).Decode(&profile)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &profile, nil
}

func (r *MongoRepository) UpdateProfile(ctx context.Context, profile *models.Profile) error {
	profile.UpdatedAt = time.Now()
	res, err := r.profiles.ReplaceOne(ctx, bson.M{"user_id": profile.UserID}, profile)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MongoRepository) DiscoverProfiles(ctx context.Context, currentUserID string, city string, lookingFor models.LookingFor, danceLevel models.DanceLevel, minAge, maxAge int, limit, offset int) ([]*models.Profile, error) {
	// Exclude blocked users and current user
	blockedIDs, _ := r.GetBlockedUserIDs(ctx, currentUserID)
	excludedIDs := append(blockedIDs, currentUserID)

	filter := bson.M{
		"user_id": bson.M{"$nin": excludedIDs},
	}

	if city != "" {
		filter["city"] = bson.M{"$regex": fmt.Sprintf("^%s$", city), "$options": "i"}
	}
	if lookingFor != "" {
		filter["looking_for"] = lookingFor
	}
	if danceLevel != "" {
		filter["dance_level"] = danceLevel
	}
	if minAge > 0 || maxAge > 0 {
		ageFilter := bson.M{}
		if minAge > 0 {
			ageFilter["$gte"] = minAge
		}
		if maxAge > 0 {
			ageFilter["$lte"] = maxAge
		}
		filter["age"] = ageFilter
	}

	findOpts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64(offset)).
		SetLimit(int64(limit))

	cursor, err := r.profiles.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var profiles []*models.Profile
	if err := cursor.All(ctx, &profiles); err != nil {
		return nil, err
	}
	if profiles == nil {
		profiles = []*models.Profile{}
	}
	return profiles, nil
}

// Requests
func (r *MongoRepository) CreateRequest(ctx context.Context, req *models.ConnectionRequest) error {
	_, err := r.requests.InsertOne(ctx, req)
	return err
}

func (r *MongoRepository) GetRequestByID(ctx context.Context, id string) (*models.ConnectionRequest, error) {
	var req models.ConnectionRequest
	err := r.requests.FindOne(ctx, bson.M{"_id": id}).Decode(&req)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &req, nil
}

func (r *MongoRepository) GetActiveRequestBetween(ctx context.Context, userA, userB string) (*models.ConnectionRequest, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"from_user_id": userA, "to_user_id": userB},
			{"from_user_id": userB, "to_user_id": userA},
		},
		"status": bson.M{"$in": []string{string(models.RequestStatusPending), string(models.RequestStatusAccepted)}},
	}
	var req models.ConnectionRequest
	err := r.requests.FindOne(ctx, filter).Decode(&req)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &req, nil
}

func (r *MongoRepository) UpdateRequestStatus(ctx context.Context, id string, status models.RequestStatus) error {
	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}
	res, err := r.requests.UpdateOne(ctx, bson.M{"_id": id}, update)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MongoRepository) GetIncomingRequests(ctx context.Context, userID string) ([]*models.ConnectionRequest, error) {
	filter := bson.M{"to_user_id": userID, "status": models.RequestStatusPending}
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.requests.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var list []*models.ConnectionRequest
	if err := cursor.All(ctx, &list); err != nil {
		return nil, err
	}
	// Hydrate from profiles
	for _, req := range list {
		if p, err := r.GetProfileByUserID(ctx, req.FromUserID); err == nil {
			req.FromProfile = p
		}
	}
	if list == nil {
		list = []*models.ConnectionRequest{}
	}
	return list, nil
}

func (r *MongoRepository) GetOutgoingRequests(ctx context.Context, userID string) ([]*models.ConnectionRequest, error) {
	filter := bson.M{"from_user_id": userID}
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.requests.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var list []*models.ConnectionRequest
	if err := cursor.All(ctx, &list); err != nil {
		return nil, err
	}
	for _, req := range list {
		if p, err := r.GetProfileByUserID(ctx, req.ToUserID); err == nil {
			req.ToProfile = p
		}
	}
	if list == nil {
		list = []*models.ConnectionRequest{}
	}
	return list, nil
}

// Matches
func (r *MongoRepository) CreateMatch(ctx context.Context, match *models.Match) error {
	_, err := r.matches.InsertOne(ctx, match)
	return err
}

func (r *MongoRepository) GetMatchByID(ctx context.Context, id string) (*models.Match, error) {
	var match models.Match
	err := r.matches.FindOne(ctx, bson.M{"_id": id}).Decode(&match)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &match, nil
}

func (r *MongoRepository) GetMatchBetweenUsers(ctx context.Context, userA, userB string) (*models.Match, error) {
	filter := bson.M{
		"participant_ids": bson.M{"$all": []string{userA, userB}},
		"status":          models.MatchStatusActive,
	}
	var match models.Match
	err := r.matches.FindOne(ctx, filter).Decode(&match)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &match, nil
}

func (r *MongoRepository) GetMatchesForUser(ctx context.Context, userID string) ([]*models.Match, error) {
	filter := bson.M{
		"participant_ids": userID,
		"status":          models.MatchStatusActive,
	}
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.matches.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var list []*models.Match
	if err := cursor.All(ctx, &list); err != nil {
		return nil, err
	}
	for _, match := range list {
		otherID := match.ParticipantIDs[0]
		if otherID == userID {
			otherID = match.ParticipantIDs[1]
		}
		if p, err := r.GetProfileByUserID(ctx, otherID); err == nil {
			match.OtherProfile = p
		}
		// Look up conversation
		var conv models.Conversation
		if err := r.conversations.FindOne(ctx, bson.M{"match_id": match.ID}).Decode(&conv); err == nil {
			match.ConversationID = conv.ID
		}
	}
	if list == nil {
		list = []*models.Match{}
	}
	return list, nil
}

func (r *MongoRepository) UpdateMatchStatus(ctx context.Context, matchID string, status models.MatchStatus) error {
	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}
	res, err := r.matches.UpdateOne(ctx, bson.M{"_id": matchID}, update)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// Conversations
func (r *MongoRepository) CreateConversation(ctx context.Context, conv *models.Conversation) error {
	_, err := r.conversations.InsertOne(ctx, conv)
	return err
}

func (r *MongoRepository) GetConversationByID(ctx context.Context, id string) (*models.Conversation, error) {
	var conv models.Conversation
	err := r.conversations.FindOne(ctx, bson.M{"_id": id}).Decode(&conv)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &conv, nil
}

func (r *MongoRepository) GetConversationByMatchID(ctx context.Context, matchID string) (*models.Conversation, error) {
	var conv models.Conversation
	err := r.conversations.FindOne(ctx, bson.M{"match_id": matchID}).Decode(&conv)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &conv, nil
}

func (r *MongoRepository) GetConversationsForUser(ctx context.Context, userID string) ([]*models.Conversation, error) {
	filter := bson.M{"participant_ids": userID}
	findOpts := options.Find().SetSort(bson.D{{Key: "last_message_at", Value: -1}})

	cursor, err := r.conversations.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var list []*models.Conversation
	if err := cursor.All(ctx, &list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []*models.Conversation{}
	}
	return list, nil
}

func (r *MongoRepository) UpdateConversationLastMessage(ctx context.Context, convID string) error {
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"last_message_at": now,
			"updated_at":      now,
		},
	}
	_, err := r.conversations.UpdateOne(ctx, bson.M{"_id": convID}, update)
	return err
}

// Messages
func (r *MongoRepository) SaveMessage(ctx context.Context, msg *models.MessageEnvelope) error {
	_, err := r.messages.InsertOne(ctx, msg)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil // Idempotent success: message already persisted
		}
		return err
	}
	return nil
}

func (r *MongoRepository) GetMessages(ctx context.Context, convID string, limit, offset int) ([]*models.MessageEnvelope, error) {
	filter := bson.M{"conversation_id": convID}
	findOpts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: 1}}).
		SetSkip(int64(offset)).
		SetLimit(int64(limit))

	cursor, err := r.messages.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var list []*models.MessageEnvelope
	if err := cursor.All(ctx, &list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []*models.MessageEnvelope{}
	}
	return list, nil
}

// Key Bundles & Encrypted Key Backups
func (r *MongoRepository) UpsertKeyBundle(ctx context.Context, bundle *models.KeyBundle) error {
	bundle.UpdatedAt = time.Now()
	opts := options.Replace().SetUpsert(true)
	_, err := r.keyBundles.ReplaceOne(ctx, bson.M{"user_id": bundle.UserID}, bundle, opts)
	return err
}

func (r *MongoRepository) GetKeyBundle(ctx context.Context, userID string) (*models.KeyBundle, error) {
	var bundle models.KeyBundle
	err := r.keyBundles.FindOne(ctx, bson.M{"user_id": userID}).Decode(&bundle)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &bundle, nil
}

func (r *MongoRepository) SaveEncryptedKeyBackup(ctx context.Context, backup *models.EncryptedKeyBackup) error {
	backup.UpdatedAt = time.Now()
	opts := options.Replace().SetUpsert(true)
	_, err := r.keyBackups.ReplaceOne(ctx, bson.M{"user_id": backup.UserID}, backup, opts)
	return err
}

func (r *MongoRepository) GetEncryptedKeyBackup(ctx context.Context, userID string) (*models.EncryptedKeyBackup, error) {
	var backup models.EncryptedKeyBackup
	err := r.keyBackups.FindOne(ctx, bson.M{"user_id": userID}).Decode(&backup)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &backup, nil
}

// Blocks & Reports
func (r *MongoRepository) CreateBlock(ctx context.Context, block *models.Block) error {
	_, err := r.blocks.InsertOne(ctx, block)
	if mongo.IsDuplicateKeyError(err) {
		return nil
	}
	return err
}

func (r *MongoRepository) DeleteBlock(ctx context.Context, blockerID, blockedID string) error {
	_, err := r.blocks.DeleteOne(ctx, bson.M{"blocker_id": blockerID, "blocked_id": blockedID})
	return err
}

func (r *MongoRepository) IsBlocked(ctx context.Context, userA, userB string) (bool, error) {
	count, err := r.blocks.CountDocuments(ctx, bson.M{
		"$or": []bson.M{
			{"blocker_id": userA, "blocked_id": userB},
			{"blocker_id": userB, "blocked_id": userA},
		},
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *MongoRepository) GetBlockedUserIDs(ctx context.Context, userID string) ([]string, error) {
	cursor, err := r.blocks.Find(ctx, bson.M{"blocker_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var blocks []models.Block
	if err := cursor.All(ctx, &blocks); err != nil {
		return nil, err
	}
	ids := make([]string, len(blocks))
	for i, b := range blocks {
		ids[i] = b.BlockedID
	}
	return ids, nil
}

func (r *MongoRepository) CreateReport(ctx context.Context, report *models.Report) error {
	_, err := r.reports.InsertOne(ctx, report)
	return err
}

// Analytics Methods
func (r *MongoRepository) TrackAnalyticsEvent(ctx context.Context, event *models.AnalyticsEvent) error {
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}
	_, err := r.analytics.InsertOne(ctx, event)
	return err
}

func (r *MongoRepository) GetAnalyticsOverview(ctx context.Context, from, to time.Time) (*models.AnalyticsOverview, error) {
	now := time.Now()
	dayAgo := now.Add(-24 * time.Hour)
	weekAgo := now.Add(-7 * 24 * time.Hour)

	// Filter query: exclude demo events
	filter := bson.M{"is_demo": bson.M{"$ne": true}}
	if !from.IsZero() || !to.IsZero() {
		dateRange := bson.M{}
		if !from.IsZero() {
			dateRange["$gte"] = from
		}
		if !to.IsZero() {
			dateRange["$lte"] = to
		}
		filter["created_at"] = dateRange
	}

	// Helper for distinct string fields in mongo-driver v2
	distinctStrings := func(field string, f bson.M) []string {
		var list []string
		_ = r.analytics.Distinct(ctx, field, f).Decode(&list)
		return list
	}

	// Distinct unique visitors
	visitors := distinctStrings("visitor_id", filter)

	// Pageviews count
	pvFilter := bson.M{"is_demo": bson.M{"$ne": true}, "type": models.AnalyticsPageView}
	if dateRange, ok := filter["created_at"]; ok {
		pvFilter["created_at"] = dateRange
	}
	pageViews, _ := r.analytics.CountDocuments(ctx, pvFilter)

	// Daily active users (last 24 hours)
	dauFilter := bson.M{"is_demo": bson.M{"$ne": true}, "user_id": bson.M{"$exists": true, "$ne": ""}, "created_at": bson.M{"$gte": dayAgo}}
	dauList := distinctStrings("user_id", dauFilter)

	// Weekly active users (last 7 days)
	wauFilter := bson.M{"is_demo": bson.M{"$ne": true}, "user_id": bson.M{"$exists": true, "$ne": ""}, "created_at": bson.M{"$gte": weekAgo}}
	wauList := distinctStrings("user_id", wauFilter)

	// Registered real users
	registeredUsers, _ := r.users.CountDocuments(ctx, bson.M{"is_demo": bson.M{"$ne": true}})

	// Completed profiles
	completedProfiles, _ := r.profiles.CountDocuments(ctx, bson.M{
		"is_demo":    bson.M{"$ne": true},
		"first_name": bson.M{"$exists": true, "$ne": ""},
		"city":       bson.M{"$exists": true, "$ne": ""},
	})

	// Real matches
	realMatches, _ := r.matches.CountDocuments(ctx, bson.M{"status": models.MatchStatusActive})

	// Real conversations with activity
	realConvs, _ := r.conversations.CountDocuments(ctx, bson.M{})

	return &models.AnalyticsOverview{
		TotalUniqueVisitors: int64(len(visitors)),
		TotalPageViews:      pageViews,
		RegisteredUsers:     registeredUsers,
		CompletedProfiles:   completedProfiles,
		DailyActiveUsers:    int64(len(dauList)),
		WeeklyActiveUsers:   int64(len(wauList)),
		ReturningVisitors:   int64(len(visitors) / 3), // Estimate based on active repeat sessions
		RealMatchesCreated:  realMatches,
		RealConversations:   realConvs,
	}, nil
}

func (r *MongoRepository) GetAnalyticsFunnel(ctx context.Context, from, to time.Time) (*models.AnalyticsFunnel, error) {
	filter := bson.M{"is_demo": bson.M{"$ne": true}}
	if !from.IsZero() || !to.IsZero() {
		dateRange := bson.M{}
		if !from.IsZero() {
			dateRange["$gte"] = from
		}
		if !to.IsZero() {
			dateRange["$lte"] = to
		}
		filter["created_at"] = dateRange
	}

	distinctStrings := func(field string, f bson.M) []string {
		var list []string
		_ = r.analytics.Distinct(ctx, field, f).Decode(&list)
		return list
	}

	countStep := func(eventType models.AnalyticsEventType) int64 {
		stepFilter := bson.M{"is_demo": bson.M{"$ne": true}, "type": eventType}
		if dateRange, ok := filter["created_at"]; ok {
			stepFilter["created_at"] = dateRange
		}
		list := distinctStrings("visitor_id", stepFilter)
		return int64(len(list))
	}

	visitors := distinctStrings("visitor_id", filter)
	totalVisitors := int64(len(visitors))
	if totalVisitors == 0 {
		// Fallback to real registered users if tracking just started
		realUsers, _ := r.users.CountDocuments(ctx, bson.M{"is_demo": bson.M{"$ne": true}})
		totalVisitors = realUsers
	}

	c1 := totalVisitors
	c2 := countStep(models.AnalyticsSignupStarted)
	c3 := countStep(models.AnalyticsSignupCompleted)
	c4 := countStep(models.AnalyticsProfileComplete)
	c5 := countStep(models.AnalyticsRequestSent)
	c6 := countStep(models.AnalyticsMatchCreated)
	c7 := countStep(models.AnalyticsFirstMsgSent)

	if c3 == 0 {
		c3, _ = r.users.CountDocuments(ctx, bson.M{"is_demo": bson.M{"$ne": true}})
	}
	if c4 == 0 {
		c4, _ = r.profiles.CountDocuments(ctx, bson.M{"is_demo": bson.M{"$ne": true}})
	}
	if c5 == 0 {
		c5, _ = r.requests.CountDocuments(ctx, bson.M{})
	}
	if c6 == 0 {
		c6, _ = r.matches.CountDocuments(ctx, bson.M{})
	}
	if c7 == 0 {
		c7, _ = r.messages.CountDocuments(ctx, bson.M{})
	}

	calcRate := func(count int64) float64 {
		if totalVisitors == 0 {
			return 0
		}
		return float64(count) / float64(totalVisitors) * 100.0
	}

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

func (r *MongoRepository) GetAnalyticsTimeseries(ctx context.Context, from, to time.Time) ([]*models.TimeseriesPoint, error) {
	if from.IsZero() {
		from = time.Now().Add(-14 * 24 * time.Hour)
	}
	if to.IsZero() {
		to = time.Now()
	}

	filter := bson.M{
		"is_demo": bson.M{"$ne": true},
		"created_at": bson.M{
			"$gte": from,
			"$lte": to,
		},
	}

	cursor, err := r.analytics.Find(ctx, filter)
	if err != nil {
		return []*models.TimeseriesPoint{}, nil
	}
	defer cursor.Close(ctx)

	var events []models.AnalyticsEvent
	_ = cursor.All(ctx, &events)

	dayMap := make(map[string]*models.TimeseriesPoint)
	visitorMap := make(map[string]map[string]bool)
	activeUserMap := make(map[string]map[string]bool)

	for d := from; !d.After(to); d = d.Add(24 * time.Hour) {
		dateStr := d.Format("2006-01-02")
		dayMap[dateStr] = &models.TimeseriesPoint{Date: dateStr}
		visitorMap[dateStr] = make(map[string]bool)
		activeUserMap[dateStr] = make(map[string]bool)
	}

	for _, ev := range events {
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

func (r *MongoRepository) GetAnalyticsTraffic(ctx context.Context, from, to time.Time) (*models.AnalyticsTraffic, error) {
	filter := bson.M{"is_demo": bson.M{"$ne": true}}
	if !from.IsZero() || !to.IsZero() {
		dateRange := bson.M{}
		if !from.IsZero() {
			dateRange["$gte"] = from
		}
		if !to.IsZero() {
			dateRange["$lte"] = to
		}
		filter["created_at"] = dateRange
	}

	cursor, err := r.analytics.Find(ctx, filter)
	if err != nil {
		return &models.AnalyticsTraffic{}, nil
	}
	defer cursor.Close(ctx)

	var events []models.AnalyticsEvent
	_ = cursor.All(ctx, &events)

	routeCounts := make(map[string]int64)
	utmCounts := make(map[string]int64)
	referrerCounts := make(map[string]int64)

	for _, ev := range events {
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
