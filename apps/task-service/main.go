package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"github.com/mattn/go-sqlite3"
)

// Task represents a task in the system
type Task struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	Priority    string    `json:"priority"`
	UserID      int       `json:"user_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateTaskRequest represents the create task request payload
type CreateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
}

// UpdateTaskRequest represents the update task request payload
type UpdateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
}

// TaskService handles task operations
type TaskService struct {
	db              *sql.DB
	authServiceURL  string
	corsOrigins     string
}

// Claims represents JWT claims
type Claims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func main() {
	// Get configuration from environment variables
	port := getEnv("PORT", "8081")
	databaseURL := getEnv("DATABASE_URL", "./data/tasks.db")
	authServiceURL := getEnv("AUTH_SERVICE_URL", "http://localhost:8080")
	corsOrigins := getEnv("CORS_ORIGINS", "http://localhost:3000")

	// Initialize database
	db, err := initDatabase(databaseURL)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Create task service
	taskService := &TaskService{
		db:             db,
		authServiceURL: authServiceURL,
		corsOrigins:    corsOrigins,
	}

	// Setup routes
	router := setupRoutes(taskService)

	// Start server
	log.Printf("Task service starting on port %s", port)
	log.Printf("Database: %s", databaseURL)
	log.Printf("Auth Service URL: %s", authServiceURL)
	log.Printf("CORS Origins: %s", corsOrigins)
	
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func initDatabase(databaseURL string) (*sql.DB, error) {
	// Create data directory if it doesn't exist
	if err := os.MkdirAll("./data", 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %v", err)
	}

	db, err := sql.Open("sqlite3", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %v", err)
	}

	// Create tasks table
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		description TEXT,
		status TEXT DEFAULT 'pending',
		priority TEXT DEFAULT 'medium',
		user_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	if _, err := db.Exec(createTableSQL); err != nil {
		return nil, fmt.Errorf("failed to create tasks table: %v", err)
	}

	// Create trigger to update updated_at timestamp
	triggerSQL := `
	CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at 
	AFTER UPDATE ON tasks
	BEGIN
		UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;
	`

	if _, err := db.Exec(triggerSQL); err != nil {
		return nil, fmt.Errorf("failed to create update trigger: %v", err)
	}

	return db, nil
}

func setupRoutes(taskService *TaskService) *mux.Router {
	router := mux.NewRouter()

	// Add CORS middleware
	router.Use(corsMiddleware(taskService.corsOrigins))

	// Health check endpoint
	router.HandleFunc("/health", healthCheck).Methods("GET")

	// Task endpoints (all require authentication)
	router.HandleFunc("/api/tasks", taskService.authMiddleware(taskService.getTasksHandler)).Methods("GET")
	router.HandleFunc("/api/tasks", taskService.authMiddleware(taskService.createTaskHandler)).Methods("POST")
	router.HandleFunc("/api/tasks/{id}", taskService.authMiddleware(taskService.getTaskHandler)).Methods("GET")
	router.HandleFunc("/api/tasks/{id}", taskService.authMiddleware(taskService.updateTaskHandler)).Methods("PUT")
	router.HandleFunc("/api/tasks/{id}", taskService.authMiddleware(taskService.deleteTaskHandler)).Methods("DELETE")

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
		"service":   "task-service",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func (ts *TaskService) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenString := r.Header.Get("Authorization")
		if tokenString == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Remove "Bearer " prefix if present
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		// Validate token with auth service
		userID, err := ts.validateToken(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Add user ID to request context
		r.Header.Set("X-User-ID", strconv.Itoa(userID))
		next.ServeHTTP(w, r)
	}
}

func (ts *TaskService) validateToken(tokenString string) (int, error) {
	// Call auth service to validate token
	req, err := http.NewRequest("GET", ts.authServiceURL+"/api/auth/validate", nil)
	if err != nil {
		return 0, err
	}

	req.Header.Set("Authorization", "Bearer "+tokenString)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("token validation failed")
	}

	var validationResponse struct {
		Valid    bool   `json:"valid"`
		UserID   int    `json:"user_id"`
		Username string `json:"username"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&validationResponse); err != nil {
		return 0, err
	}

	if !validationResponse.Valid {
		return 0, fmt.Errorf("invalid token")
	}

	return validationResponse.UserID, nil
}

func (ts *TaskService) getTasksHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get query parameters
	status := r.URL.Query().Get("status")
	priority := r.URL.Query().Get("priority")

	// Build query
	query := "SELECT id, title, description, status, priority, user_id, created_at, updated_at FROM tasks WHERE user_id = ?"
	args := []interface{}{userID}

	if status != "" {
		query += " AND status = ?"
		args = append(args, status)
	}

	if priority != "" {
		query += " AND priority = ?"
		args = append(args, priority)
	}

	query += " ORDER BY created_at DESC"

	rows, err := ts.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var task Task
		err := rows.Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority, &task.UserID, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			http.Error(w, "Database scan error", http.StatusInternalServerError)
			return
		}
		tasks = append(tasks, task)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(tasks)
}

func (ts *TaskService) createTaskHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// Set default priority if not provided
	if req.Priority == "" {
		req.Priority = "medium"
	}

	// Insert task
	result, err := ts.db.Exec(`
		INSERT INTO tasks (title, description, priority, user_id) 
		VALUES (?, ?, ?, ?)
	`, req.Title, req.Description, req.Priority, userID)

	if err != nil {
		http.Error(w, "Failed to create task", http.StatusInternalServerError)
		return
	}

	// Get created task
	taskID, _ := result.LastInsertId()
	var task Task
	err = ts.db.QueryRow(`
		SELECT id, title, description, status, priority, user_id, created_at, updated_at 
		FROM tasks WHERE id = ?
	`, taskID).Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority, &task.UserID, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		http.Error(w, "Failed to retrieve created task", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(task)
}

func (ts *TaskService) getTaskHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	vars := mux.Vars(r)
	taskID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	var task Task
	err = ts.db.QueryRow(`
		SELECT id, title, description, status, priority, user_id, created_at, updated_at 
		FROM tasks WHERE id = ? AND user_id = ?
	`, taskID, userID).Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority, &task.UserID, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Task not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(task)
}

func (ts *TaskService) updateTaskHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	vars := mux.Vars(r)
	taskID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	var req UpdateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if task exists and belongs to user
	var existingTask Task
	err = ts.db.QueryRow(`
		SELECT id, title, description, status, priority, user_id, created_at, updated_at 
		FROM tasks WHERE id = ? AND user_id = ?
	`, taskID, userID).Scan(&existingTask.ID, &existingTask.Title, &existingTask.Description, &existingTask.Status, &existingTask.Priority, &existingTask.UserID, &existingTask.CreatedAt, &existingTask.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Task not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Update task
	_, err = ts.db.Exec(`
		UPDATE tasks SET title = ?, description = ?, status = ?, priority = ? 
		WHERE id = ? AND user_id = ?
	`, req.Title, req.Description, req.Status, req.Priority, taskID, userID)

	if err != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}

	// Get updated task
	var task Task
	err = ts.db.QueryRow(`
		SELECT id, title, description, status, priority, user_id, created_at, updated_at 
		FROM tasks WHERE id = ? AND user_id = ?
	`, taskID, userID).Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority, &task.UserID, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		http.Error(w, "Failed to retrieve updated task", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(task)
}

func (ts *TaskService) deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	vars := mux.Vars(r)
	taskID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	// Check if task exists and belongs to user
	var count int
	err = ts.db.QueryRow(`
		SELECT COUNT(*) FROM tasks WHERE id = ? AND user_id = ?
	`, taskID, userID).Scan(&count)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if count == 0 {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	// Delete task
	_, err = ts.db.Exec(`
		DELETE FROM tasks WHERE id = ? AND user_id = ?
	`, taskID, userID)

	if err != nil {
		http.Error(w, "Failed to delete task", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
