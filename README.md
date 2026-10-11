# 🪘 Dandiya +1

> **Single this Navratri? Find someone to dance with.**  
> A seasonal matchmaking web application with genuine **End-to-End Encrypted (E2EE)** 1-to-1 chat, designed for Navratri dancers across India.

---

## 🌟 Concept & Philosophy

Navratri is a festival of energy, music, and community. Many people love Garba and Dandiya Raas but don't have a partner or their friend group is unavailable.

**Dandiya +1 is NOT Tinder or Bumble.**
- ❌ No swiping mechanics or algorithmic gamification
- ❌ No personality tests or fake compatibility percentages
- ❌ No public chat rooms or group spam
- ❌ No precise location/GPS exposure (city-only privacy)
- ✅ Clear, respectful 4-step flow:
  1. **Create Profile** (city, dance level, bio, 1 photo)
  2. **Discover Dancers** (same city, dance level, looking for)
  3. **Mutual Request & Match** (both users must accept)
  4. **Private Encrypted Chat & Dance** (E2EE 1-to-1 chat to coordinate meeting at the festival grounds)

---

## 🔐 End-to-End Encryption (E2EE) Architecture

Genuine client-side encryption is a core requirement of Dandiya +1. **The Go backend and database NEVER receive or store plaintext messages.**

```
[User A Device]                                          [Go Backend / DB]                                    [User B Device]
      │                                                         │                                                   │
  1. Generate ECDH KeyPair (NIST P-256)                         │                                               1. Generate ECDH KeyPair (NIST P-256)
     Private key -> Stored in IndexedDB                         │                                                  Private key -> Stored in IndexedDB
     Public key  ───────────────────────────────> Stored in KeyBundles <─────────────────────────────── Public key
                                                                │
  2. Fetch User B's Public Key <────────────────────────────────┤
     ECDH(Priv_A, Pub_B) -> Shared Secret                       │
     HKDF-SHA256(Secret, ConvID) -> AES-256-GCM Key             │
     Encrypt(Plaintext, Random 12-byte IV)                      │
     Ciphertext + IV ───────────────────────────> Save Envelope ───────────────────────────────> Ciphertext + IV
                                                 (Opaque Payload)                                 │
                                                                                        3. ECDH(Priv_B, Pub_A) -> Same Shared Secret
                                                                                           HKDF-SHA256 -> Same AES-256-GCM Key
                                                                                           Decrypt(Ciphertext, IV) -> Recover Plaintext!
```

### Cryptographic Guarantees:
- **Primitives:** NIST P-256 ECDH for key exchange, HKDF-SHA256 for key expansion, AES-256-GCM for authenticated encryption.
- **Zero Server Knowledge:** The server acts purely as a routing and delivery conduit for opaque ciphertext envelopes and random 96-bit initialization vectors.
- **Integrity & Tampering Detection:** Any modification to ciphertext or IV in transit causes immediate `OperationError` decryption failure on the recipient's device.
- **Local Persistence:** Private keys are stored strictly in browser IndexedDB (`dandiya_e2ee_keystore`) and never transmitted across the network.

---

## 🎨 Visual Design & Aesthetics

The application follows an authentic, modern Navratri aesthetic:
- **Base Canvas:** Pure White (`#FFFFFF`).
- **Ambient Blurred Glassy Bubbles:** Floating soft organic gradients in maroon (`#8B0036`), magenta/pink (`#D81B60`), purple (`#9333EA`), sky blue (`#3B82F6`), and festive green (`#22C55E`).
- **Animated Primary CTA Buttons:** Shifting linear gradient from Maroon (`#8B0036`) to Vibrant Pink (`#D81B60`) with soft ambient glow.
- **Typography:** DM Serif Display / Playfair Display for headings; Poppins / Inter for body.
- **Responsive Layout:** Optimized specifically for mobile (360px, 390px, 430px) as well as tablet and desktop.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + Custom Festive Design Tokens
- **Icons:** Lucide React + Custom Festive Dandiya SVGs
- **State & Data Fetching:** Zustand (Auth/Session) + TanStack Query / React Query
- **Routing:** React Router v7
- **Realtime:** WebSocket Client with auto-reconnection, typing indicators, and presence
- **Cryptography:** Native Browser Web Crypto API (`window.crypto.subtle`) + IndexedDB

### Backend
- **Language:** Go (1.24+)
- **Architecture:** Clean modular architecture (`internal/auth`, `internal/profiles`, `internal/discovery`, `internal/requests`, `internal/matches`, `internal/chat`, `internal/crypto`, `internal/reports`, `internal/blocks`, `internal/storage`, `internal/websocket`)
- **HTTP / Router:** Gin Web Framework
- **Realtime:** Gorilla WebSocket Hub with per-conversation authorization checks
- **Database:** Official MongoDB Go Driver (`go.mongodb.org/mongo-driver/v2`) with automatic fallback to high-performance in-memory repository for zero-dependency local runs and testing
- **Authentication:** Argon2id password hashing + HMAC-SHA256 JWT tokens + Secure HTTP-only cookies
- **Safety:** IP rate limiting, input sanitization, security headers, file magic-byte inspection (JPEG, PNG, WEBP), and MIME validation

---

## 🚀 Getting Started

### Prerequisites
- Go 1.22+
- Node.js 18+ and npm
- (Optional) MongoDB Atlas URI or local MongoDB instance

---

### 1. Backend Setup

```bash
cd backend

# Copy sample configuration
cp ../.env.example .env

# Run Go tests (Auth, Matching, and E2EE Zero-Knowledge Integration tests)
go test -v ./tests/...

# Run the Go backend server
go run ./cmd/server
```

The server starts on `http://localhost:8080`.  
*(If `MONGODB_URI` is set to `memory://` or MongoDB is not running, the backend seamlessly runs with its thread-safe in-memory store so you can develop and test immediately without external databases!)*

---

### 2. Frontend Setup

In another terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will be running on `http://localhost:5173`.

---

## 🧪 Testing

### Backend Unit & Integration Tests
Run the test suite to verify Argon2id hashing, connection request limits, mutual matching, safety/block isolation, and the **full E2EE cryptographic cycle**:

```bash
cd backend
go test -v ./tests/...
```

Expected output:
```
=== RUN   TestE2EECompleteFlowAndBackendZeroKnowledge
    e2ee_test.go:240: ✓ Verified E2EE: Plaintext 'Hey Arjun! Let's play Dandiya at the Royal Heritage venue tonight! 🪘✨' successfully encrypted, routed as opaque ciphertext, and decrypted by recipient.
--- PASS: TestE2EECompleteFlowAndBackendZeroKnowledge (0.00s)
=== RUN   TestAuthAndArgon2id
--- PASS: TestAuthAndArgon2id (0.31s)
=== RUN   TestMatchingAndSafetyFlow
    integration_test.go:148: ✓ Matching, Discovery, and Safety integration test passed successfully!
--- PASS: TestMatchingAndSafetyFlow (0.00s)
PASS
```

### Frontend Build Validation
```bash
cd frontend
npm run build
```

---

---

## 🚀 Production Hosting Guide

### Architecture Overview
Dandiya +1 consists of two production services:
1. **Frontend (Vercel):** High-speed edge CDN hosting the React + Vite Single-Page Application (SPA) with client-side E2EE Web Crypto.
2. **Backend (Render / Railway / Fly.io / VPS):** Long-running Go server handling persistent WebSockets (`/ws`), authentication, opaque encrypted message envelope routing, and database storage.

---

### Step 1: Deploy Go Backend (Render / Railway / Fly.io)

Because Vercel is a stateless serverless platform with execution limits that do **not** support persistent WebSockets, the Go backend runs on any persistent container host.

#### Option A: One-Click Deploy on Render (Free/Standard)
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New +** → **Web Service**.
3. Select your GitHub repository.
4. Set the following settings:
   - **Root Directory:** `backend`
   - **Runtime:** `Docker` (or `Go`)
   - **Build Command (if Go):** `go build -o server ./cmd/server`
   - **Start Command (if Go):** `./server`
5. Under **Environment Variables**, add:
   ```env
   PORT=8080
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/dandiya_db?retryWrites=true&w=majority
   DB_NAME=dandiya_db
   JWT_SECRET=your-super-strong-jwt-secret-key-at-least-32-chars
   UPLOAD_DIR=./uploads
   ALLOWED_ORIGIN=https://your-dandiya-app.vercel.app
   ```
6. Click **Deploy Web Service**. Render will assign you a live HTTPS URL (e.g. `https://dandiya-backend.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** → **Project**.
2. Select your `Dandiya` GitHub repository.
3. In the **Configure Project** screen:
   - **Project Name:** `dandiya-plus-one` (or your preferred name)
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select **`frontend`** 👈 *(CRITICAL)*
4. Under **Environment Variables**, add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://dandiya-backend.onrender.com` (your backend URL from Step 1, without trailing slash)
   *(Note: Dandiya +1 automatically converts this to `wss://...` for WebSockets!)*
5. Click **Deploy**!
6. Vercel will build the Vite SPA and deploy it to a global edge domain (e.g. `https://dandiya-plus-one.vercel.app`).
7. Update `ALLOWED_ORIGIN` in your backend environment variables with your final Vercel domain.

---

## 🐳 Docker Deployment (Self-Hosted Alternative)

To run the complete stack (MongoDB, Go Backend, and React Frontend) on a single VPS or local machine with Docker Compose:

```bash
docker compose up --build -d
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- MongoDB: `localhost:27017`

---

## 🛡️ Security Review Checklist

- [x] **Zero Plaintext on Server:** Chat messages are encrypted client-side with AES-256-GCM.
- [x] **Zero Private Key Exposure:** Private keys are generated locally and never leave the browser.
- [x] **Argon2id Password Storage:** Resistant to GPU/ASIC brute-force cracking.
- [x] **Rate Limiting:** Prevents auth brute-forcing and request flooding.
- [x] **Location Privacy:** Only city names are exposed; exact GPS coordinates are never collected.
- [x] **Authorization Checks:** Conversation messages and profiles are verified against active mutual matches.
- [x] **File Magic Byte Sniffing:** Prevents MIME spoofing and malicious file uploads.
- [x] **Anti-Abuse Tools:** Instant block and report endpoints available directly on profile cards and chats.

---

## 📄 License
MIT License. Built for Navratri 2026.
