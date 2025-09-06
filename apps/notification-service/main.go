package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
)

// Notification represents a notification in the system
type Notification struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"created_at"`
}

// CreateNotificationRequest represents the create notification request payload
type CreateNotificationRequest struct {
	UserID  int    `json:"user_id"`
	Title   string `json:"title"`
	Message string `json:"message"`
	Type    string `json:"type"`
}

// WebhookRequest represents a webhook request
type WebhookRequest struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// NotificationService handles notification operations
type NotificationService struct {
	corsOrigins string
	webhooks    map[string][]string // event type -> webhook URLs
}

// Claims represents JWT claims
type Claims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func main() {
	// Get configuration from environment variables
	port := getEnv("PORT", "8082")
	corsOrigins := getEnv("CORS_ORIGINS", "http://localhost:3000")

	// Create notification service
	notificationService := &NotificationService{
		corsOrigins: corsOrigins,
		webhooks:    make(map[string][]string),
	}

	// Setup routes
	router := setupRoutes(notificationService)

	// Start server
	log.Printf("Notification service starting on port %s", port)
	log.Printf("CORS Origins: %s", corsOrigins)
	
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func setupRoutes(ns *NotificationService) *mux.Router {
	router := mux.NewRouter()

	// Add CORS middleware
	router.Use(corsMiddleware(ns.corsOrigins))

	// Health check endpoint
	router.HandleFunc("/health", healthCheck).Methods("GET")

	// Notification endpoints
	router.HandleFunc("/api/notifications", ns.getNotificationsHandler).Methods("GET")
	router.HandleFunc("/api/notifications", ns.createNotificationHandler).Methods("POST")
	router.HandleFunc("/api/notifications/{id}/read", ns.markAsReadHandler).Methods("PUT")
	router.HandleFunc("/api/notifications/read-all", ns.markAllAsReadHandler).Methods("PUT")

	// Webhook endpoints
	router.HandleFunc("/api/webhooks", ns.registerWebhookHandler).Methods("POST")
	router.HandleFunc("/api/webhooks/{event}", ns.triggerWebhookHandler).Methods("POST")

	// Demo endpoints for testing
	router.HandleFunc("/api/demo/send-notification", ns.demoSendNotificationHandler).Methods("POST")

	return router
}

func corsMiddleware(corsOrigins string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", corsOrigins)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":    "healthy",
		"service":   "notification-service",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func (ns *NotificationService) getNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	// For demo purposes, return mock notifications
	// In a real application, this would query a database
	notifications := []Notification{
		{
			ID:        1,
			UserID:    1,
			Title:     "Welcome!",
			Message:   "Welcome to the Task Manager application!",
			Type:      "info",
			Read:      false,
			CreatedAt: time.Now().Add(-1 * time.Hour),
		},
		{
			ID:        2,
			UserID:    1,
			Title:     "Task Completed",
			Message:   "Your task 'Setup project' has been completed.",
			Type:      "success",
			Read:      true,
			CreatedAt: time.Now().Add(-2 * time.Hour),
		},
		{
			ID:        3,
			UserID:    1,
			Title:     "Deadline Approaching",
			Message:   "Task 'Review code' is due tomorrow.",
			Type:      "warning",
			Read:      false,
			CreatedAt: time.Now().Add(-30 * time.Minute),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(notifications)
}

func (ns *NotificationService) createNotificationHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Title == "" || req.Message == "" {
		http.Error(w, "Title and message are required", http.StatusBadRequest)
		return
	}

	// Create notification (in-memory for demo)
	notification := Notification{
		ID:        len(ns.webhooks) + 1, // Simple ID generation for demo
		UserID:    req.UserID,
		Title:     req.Title,
		Message:   req.Message,
		Type:      req.Type,
		Read:      false,
		CreatedAt: time.Now(),
	}

	// Trigger webhooks for notification events
	go ns.triggerWebhooks("notification.created", notification)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(notification)
}

func (ns *NotificationService) markAsReadHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	notificationID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid notification ID", http.StatusBadRequest)
		return
	}

	// In a real application, this would update the database
	log.Printf("Marking notification %d as read", notificationID)

	// Trigger webhooks for read events
	go ns.triggerWebhooks("notification.read", map[string]interface{}{
		"notification_id": notificationID,
		"timestamp":       time.Now(),
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "marked as read"})
}

func (ns *NotificationService) markAllAsReadHandler(w http.ResponseWriter, r *http.Request) {
	// In a real application, this would update all notifications for a user
	log.Println("Marking all notifications as read")

	// Trigger webhooks for bulk read events
	go ns.triggerWebhooks("notifications.read_all", map[string]interface{}{
		"timestamp": time.Now(),
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "all marked as read"})
}

func (ns *NotificationService) registerWebhookHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Event string `json:"event"`
		URL   string `json:"url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Event == "" || req.URL == "" {
		http.Error(w, "Event and URL are required", http.StatusBadRequest)
		return
	}

	// Register webhook
	if ns.webhooks[req.Event] == nil {
		ns.webhooks[req.Event] = []string{}
	}
	ns.webhooks[req.Event] = append(ns.webhooks[req.Event], req.URL)

	log.Printf("Registered webhook for event '%s' at URL '%s'", req.Event, req.URL)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "webhook registered",
		"event":  req.Event,
		"url":    req.URL,
	})
}

func (ns *NotificationService) triggerWebhookHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	event := vars["event"]

	var data interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Trigger webhooks for the specified event
	go ns.triggerWebhooks(event, data)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "webhooks triggered",
		"event":  event,
	})
}

func (ns *NotificationService) demoSendNotificationHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID  int    `json:"user_id"`
		Title   string `json:"title"`
		Message string `json:"message"`
		Type    string `json:"type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set defaults
	if req.Type == "" {
		req.Type = "info"
	}

	// Create notification
	notification := Notification{
		ID:        len(ns.webhooks) + 1,
		UserID:    req.UserID,
		Title:     req.Title,
		Message:   req.Message,
		Type:      req.Type,
		Read:      false,
		CreatedAt: time.Now(),
	}

	// Trigger webhooks
	go ns.triggerWebhooks("notification.created", notification)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(notification)
}

func (ns *NotificationService) triggerWebhooks(event string, data interface{}) {
	webhookURLs, exists := ns.webhooks[event]
	if !exists {
		log.Printf("No webhooks registered for event: %s", event)
		return
	}

	payload := WebhookRequest{
		Event: event,
		Data:  data,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal webhook payload: %v", err)
		return
	}

	for _, url := range webhookURLs {
		go func(webhookURL string) {
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Post(webhookURL, "application/json", bytes.NewBuffer(payloadBytes))
			if err != nil {
				log.Printf("Failed to send webhook to %s: %v", webhookURL, err)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				log.Printf("Webhook sent successfully to %s", webhookURL)
			} else {
				log.Printf("Webhook failed with status %d for %s", resp.StatusCode, webhookURL)
			}
		}(url)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
