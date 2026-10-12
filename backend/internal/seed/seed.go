package seed

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
)

type DemoPerson struct {
	FirstName  string
	LastName   string
	Age        int
	Sex        string // "F" or "M"
	DanceLevel models.DanceLevel
	LookingFor models.LookingFor
	Bio        string
	PhotoURL   string
}

// Curated 15 templates per city (9 women, 6 men, aged 20-28)
var baseTemplates = []DemoPerson{
	// 9 Women
	{
		FirstName:  "Diya",
		LastName:   "Patel",
		Age:        22,
		Sex:        "F",
		DanceLevel: models.DanceLevelPro,
		LookingFor: models.LookingForPartner,
		Bio:        "Doing 3-taali Garba since age 6! Looking for an energetic partner for GMDC grounds who can match 2-beat and 3-beat rhythm without getting tired.",
		PhotoURL:   "/assets/sample_riya.jpg",
	},
	{
		FirstName:  "Ananya",
		LastName:   "Sharma",
		Age:        24,
		Sex:        "F",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForFriends,
		Bio:        "UI designer by day, Garba enthusiast by night. Got my Chaniya Choli ready for all 9 nights! Looking for a fun group to hit the venues together.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=AnanyaFestive",
	},
	{
		FirstName:  "Riya",
		LastName:   "Shah",
		Age:        21,
		Sex:        "F",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Practicing Dodhiya spins every evening. Need a reliable Dandiya +1 so we don't end up standing awkwardly near the food stalls!",
		PhotoURL:   "/assets/sample_tanvi.jpg",
	},
	{
		FirstName:  "Kruti",
		LastName:   "Trivedi",
		Age:        25,
		Sex:        "F",
		DanceLevel: models.DanceLevelPro,
		LookingFor: models.LookingForPartner,
		Bio:        "Classical Kathak trained dancer. Love fast-paced Sanedo and traditional Raas. Let's practice steps beforehand and win best dressed pair!",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=KrutiFestive",
	},
	{
		FirstName:  "Aayushi",
		LastName:   "Parekh",
		Age:        23,
		Sex:        "F",
		DanceLevel: models.DanceLevelBeginner,
		LookingFor: models.LookingForFriends,
		Bio:        "Moved here recently for work. Total beginner but have 100% enthusiasm! Looking for patient friends who can teach me basic 2-taali.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=AayushiFestive",
	},
	{
		FirstName:  "Meera",
		LastName:   "Desai",
		Age:        26,
		Sex:        "F",
		DanceLevel: models.DanceLevelPro,
		LookingFor: models.LookingForGroup,
		Bio:        "Navratri is my favorite festival of the year! Organizing a group to hop between pass-only heritage garba grounds. Join our circle!",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=MeeraFestive",
	},
	{
		FirstName:  "Sneha",
		LastName:   "Kulkarni",
		Age:        24,
		Sex:        "F",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Love the live orchestra dhol beats! Looking for a positive partner to play Dandiya Raas with mutual coordination and zero stress.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=SnehaFestive",
	},
	{
		FirstName:  "Pooja",
		LastName:   "Mehta",
		Age:        27,
		Sex:        "F",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Passionate dancer, photographer on weekends. Looking for someone genuine to celebrate Navratri evenings with festive joy.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=PoojaFestive",
	},
	{
		FirstName:  "Kavya",
		LastName:   "Iyer",
		Age:        23,
		Sex:        "F",
		DanceLevel: models.DanceLevelBeginner,
		LookingFor: models.LookingForFriends,
		Bio:        "First time playing Dandiya in Gujarat! Super excited about the street food and midnight energy. Need friendly companions to guide me.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=KavyaFestive",
	},

	// 6 Men
	{
		FirstName:  "Arjun",
		LastName:   "Vyas",
		Age:        24,
		Sex:        "M",
		DanceLevel: models.DanceLevelPro,
		LookingFor: models.LookingForPartner,
		Bio:        "Can spin non-stop through fast Titodo! Need a synchronized partner who knows 6-step and 8-step Garba routines.",
		PhotoURL:   "/assets/sample_arjun.jpg",
	},
	{
		FirstName:  "Rohan",
		LastName:   "Mehta",
		Age:        25,
		Sex:        "M",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Software engineer who turns into a Garba fanatic every Ashwin month. Looking for a partner so we don't end up dancing alone in random circles.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=RohanFestive",
	},
	{
		FirstName:  "Devang",
		LastName:   "Shah",
		Age:        26,
		Sex:        "M",
		DanceLevel: models.DanceLevelPro,
		LookingFor: models.LookingForGroup,
		Bio:        "United Way & Shanku's regular. Got early bird club passes. Forming a squad of 8-10 dancers who love midnight Garba vibes.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=DevangFestive",
	},
	{
		FirstName:  "Parth",
		LastName:   "Patel",
		Age:        22,
		Sex:        "M",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Energetic, respectful, and always carrying extra wooden dandiya sticks just in case. Looking for a partner for weekends 7-9 PM.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=ParthFestive",
	},
	{
		FirstName:  "Siddharth",
		LastName:   "Rao",
		Age:        27,
		Sex:        "M",
		DanceLevel: models.DanceLevelBeginner,
		LookingFor: models.LookingForFriends,
		Bio:        "Not a pro dancer yet, but good company and know the best post-Garba fafda-jalebi spots in town. Looking for chill festive friends.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=SiddharthFestive",
	},
	{
		FirstName:  "Kabir",
		LastName:   "Chauhan",
		Age:        28,
		Sex:        "M",
		DanceLevel: models.DanceLevelIntermediate,
		LookingFor: models.LookingForPartner,
		Bio:        "Love the traditional acoustic folk garba over loud commercial remakes. Looking for a like-minded dance partner who appreciates the culture.",
		PhotoURL:   "https://api.dicebear.com/7.x/adventurer/svg?seed=KabirFestive",
	},
}

// Supported major Indian cities
var SupportedCities = []string{
	"Ahmedabad",
	"Vadodara",
	"Surat",
	"Mumbai",
	"Jaipur",
	"Pune",
	"Delhi",
	"Bengaluru",
}

// SeedDemoProfiles is fully idempotent: it checks if demo profiles exist for each city and creates/updates them
func SeedDemoProfiles(ctx context.Context, repo database.Repository) error {
	log.Printf("[Demo Seed] Running idempotent demo profile initialization across %d cities...", len(SupportedCities))

	totalCreated := 0
	totalSkipped := 0

	for _, city := range SupportedCities {
		for i, tmpl := range baseTemplates {
			email := fmt.Sprintf("demo.%s.%s%d@dandiya.internal", strings.ToLower(city), strings.ToLower(tmpl.FirstName), i+1)
			userID := fmt.Sprintf("demo-usr-%s-%s-%d", strings.ToLower(city), strings.ToLower(tmpl.FirstName), i+1)

			// Check if user already exists
			existingUser, _ := repo.GetUserByEmail(ctx, email)
			if existingUser != nil {
				totalSkipped++
				continue
			}

			now := time.Now().UTC()
			user := &models.User{
				ID:           userID,
				Email:        email,
				PasswordHash: "$argon2id$v=19$m=65536,t=3,p=2$DEMO_UNAUTHENTICABLE_HASH_SALT$DEMO_HASH", // Cannot be authenticated with normal password
				Status:       models.UserStatusActive,
				Role:         "user",
				IsDemo:       true, // CRITICAL: explicitly tagged as demo profile
				CreatedAt:    now,
				UpdatedAt:    now,
			}

			if err := repo.CreateUser(ctx, user); err != nil {
				log.Printf("[Demo Seed] Warning: could not create user %s: %v", email, err)
				continue
			}

			profileID := fmt.Sprintf("demo-prof-%s-%s-%d", strings.ToLower(city), strings.ToLower(tmpl.FirstName), i+1)
			profile := &models.Profile{
				ID:         profileID,
				UserID:     userID,
				FirstName:  tmpl.FirstName,
				LastName:   tmpl.LastName,
				Age:        tmpl.Age,
				City:       city,
				Sex:        tmpl.Sex,
				DanceLevel: tmpl.DanceLevel,
				LookingFor: tmpl.LookingFor,
				Bio:        tmpl.Bio,
				PhotoURL:   tmpl.PhotoURL,
				IsDemo:     true, // CRITICAL: explicitly tagged as demo profile
				CreatedAt:  now,
				UpdatedAt:  now,
			}

			if err := repo.CreateProfile(ctx, profile); err != nil {
				log.Printf("[Demo Seed] Warning: could not create profile for %s: %v", email, err)
				continue
			}

			totalCreated++
		}
	}

	log.Printf("[Demo Seed] Completed! %d demo profiles created, %d existing verified.", totalCreated, totalSkipped)
	return nil
}
