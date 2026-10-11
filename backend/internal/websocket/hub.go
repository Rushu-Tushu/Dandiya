package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/dandiya/dandiya-plus-one/internal/auth"
	"github.com/dandiya/dandiya-plus-one/internal/database"
	"github.com/dandiya/dandiya-plus-one/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Origin checked in CORS middleware
	},
}

type WSEventType string

const (
	EventMessage     WSEventType = "message"
	EventTypingStart WSEventType = "typing_start"
	EventTypingStop  WSEventType = "typing_stop"
	EventPresence    WSEventType = "presence"
	EventAck         WSEventType = "message_ack"
	EventError       WSEventType = "error"
)

type WSMessage struct {
	Type            WSEventType             `json:"type"`
	ConversationID  string                  `json:"conversationId,omitempty"`
	RecipientID     string                  `json:"recipientId,omitempty"`
	SenderID        string                  `json:"senderId,omitempty"`
	MessageEnvelope *models.MessageEnvelope `json:"messageEnvelope,omitempty"`
	Payload         interface{}             `json:"payload,omitempty"`
	Timestamp       time.Time               `json:"timestamp"`
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID string
}

type Hub struct {
	clients    map[string]map[*Client]bool // userID -> set of clients (multi-tab support)
	register   chan *Client
	unregister chan *Client
	broadcast  chan *WSMessage
	repo       database.Repository
	jwtSecret  string
	mu         sync.RWMutex
}

func NewHub(repo database.Repository, jwtSecret string) *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *WSMessage, 256),
		repo:       repo,
		jwtSecret:  jwtSecret,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if _, ok := h.clients[client.userID]; !ok {
				h.clients[client.userID] = make(map[*Client]bool)
			}
			h.clients[client.userID][client] = true
			isFirst := len(h.clients[client.userID]) == 1
			h.mu.Unlock()

			if isFirst {
				// Broadcast presence: online
				h.notifyPresence(client.userID, true)
			}

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.userID]; ok {
				delete(clients, client)
				close(client.send)
				if len(clients) == 0 {
					delete(h.clients, client.userID)
					h.mu.Unlock()
					h.notifyPresence(client.userID, false)
					continue
				}
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.routeMessage(msg)
		}
	}
}

func (h *Hub) notifyPresence(userID string, online bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	convs, err := h.repo.GetConversationsForUser(ctx, userID)
	if err != nil {
		return
	}

	for _, conv := range convs {
		otherID := conv.ParticipantIDs[0]
		if otherID == userID {
			otherID = conv.ParticipantIDs[1]
		}

		event := &WSMessage{
			Type:           EventPresence,
			ConversationID: conv.ID,
			SenderID:       userID,
			Payload: gin.H{
				"userId": userID,
				"online": online,
			},
			Timestamp: time.Now(),
		}
		h.SendToUser(otherID, event)
	}
}

func (h *Hub) routeMessage(msg *WSMessage) {
	if msg.RecipientID != "" {
		h.SendToUser(msg.RecipientID, msg)
	}
	if msg.SenderID != "" {
		h.SendToUser(msg.SenderID, msg) // Echo to other tabs of sender
	}
}

func (h *Hub) SendToUser(userID string, msg *WSMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	if clients, ok := h.clients[userID]; ok {
		for client := range clients {
			select {
			case client.send <- data:
			default:
				close(client.send)
				delete(clients, client)
			}
		}
	}
}

func (h *Hub) IsUserOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients[userID]) > 0
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(65536)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Read error for user %s: %v", c.userID, err)
			}
			break
		}

		var incoming WSMessage
		if err := json.Unmarshal(messageBytes, &incoming); err != nil {
			continue
		}

		incoming.SenderID = c.userID
		incoming.Timestamp = time.Now()

		// Verify conversation authorization
		if incoming.ConversationID == "" {
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		conv, err := c.hub.repo.GetConversationByID(ctx, incoming.ConversationID)
		cancel()

		if err != nil || conv == nil {
			continue
		}

		isParticipant := false
		var recipientID string
		for _, p := range conv.ParticipantIDs {
			if p == c.userID {
				isParticipant = true
			} else {
				recipientID = p
			}
		}
		if !isParticipant {
			continue // Unauthorized to participate in this conversation
		}
		incoming.RecipientID = recipientID

		// Process by event type
		switch incoming.Type {
		case EventMessage:
			if incoming.MessageEnvelope == nil {
				continue
			}
			// Server stores OPAQUE encrypted envelope
			envelope := incoming.MessageEnvelope
			envelope.ID = uuid.New().String()
			envelope.ConversationID = incoming.ConversationID
			envelope.SenderID = c.userID
			envelope.RecipientID = recipientID
			envelope.CreatedAt = time.Now()

			saveCtx, saveCancel := context.WithTimeout(context.Background(), 2*time.Second)
			_ = c.hub.repo.SaveMessage(saveCtx, envelope)
			_ = c.hub.repo.UpdateConversationLastMessage(saveCtx, incoming.ConversationID)
			saveCancel()

			incoming.MessageEnvelope = envelope
			c.hub.broadcast <- &incoming

		case EventTypingStart, EventTypingStop:
			// Ephemeral typing indicators
			c.hub.SendToUser(recipientID, &incoming)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			if _, err := w.Write(message); err != nil {
				return
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) HandleWebSocket(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		tokenStr = c.GetHeader("Sec-WebSocket-Protocol")
	}
	if tokenStr == "" {
		cookie, err := c.Cookie("dandiya_token")
		if err == nil {
			tokenStr = cookie
		}
	}

	claims, err := auth.ParseToken(tokenStr, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized websocket connection"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS] Upgrade failed: %v", err)
		return
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: claims.UserID,
	}

	h.register <- client

	go client.writePump()
	go client.readPump()
}
