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
	blocks        *mongo.Collection
	reports       *mongo.Collection
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
		blocks:        db.Collection("blocks"),
		reports:       db.Collection("reports"),
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

	return err
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
	return err
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

// Key Bundles
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
