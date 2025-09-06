#!/bin/bash

# Database Initialization Script for Task Manager
# This script initializes the SQLite databases for all services

echo "🚀 Initializing Task Manager Databases..."

# Create data directories
mkdir -p apps/auth-service/data
mkdir -p apps/task-service/data

echo "📁 Created data directories"

# Initialize Auth Service Database
echo "🔐 Initializing Auth Service database..."
cd apps/auth-service

# Create a simple Go program to initialize the database
cat > init_db.go << 'EOF'
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Create data directory if it doesn't exist
	if err := os.MkdirAll("./data", 0755); err != nil {
		log.Fatal("Failed to create data directory:", err)
	}

	db, err := sql.Open("sqlite3", "./data/auth.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	// Create users table
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	if _, err := db.Exec(createTableSQL); err != nil {
		log.Fatal("Failed to create users table:", err)
	}

	// Create default admin user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash default password:", err)
	}

	_, err = db.Exec(`
		INSERT OR IGNORE INTO users (username, email, password_hash) 
		VALUES (?, ?, ?)
	`, "admin", "admin@taskmanager.com", string(hashedPassword))

	if err != nil {
		log.Fatal("Failed to create default user:", err)
	}

	fmt.Println("✅ Auth Service database initialized successfully")
}
EOF

# Run the initialization
go run init_db.go
rm init_db.go

cd ../..

# Initialize Task Service Database
echo "📋 Initializing Task Service database..."
cd apps/task-service

cat > init_db.go << 'EOF'
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Create data directory if it doesn't exist
	if err := os.MkdirAll("./data", 0755); err != nil {
		log.Fatal("Failed to create data directory:", err)
	}

	db, err := sql.Open("sqlite3", "./data/tasks.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

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
		log.Fatal("Failed to create tasks table:", err)
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
		log.Fatal("Failed to create update trigger:", err)
	}

	fmt.Println("✅ Task Service database initialized successfully")
}
EOF

# Run the initialization
go run init_db.go
rm init_db.go

cd ../..

echo "🎉 All databases initialized successfully!"
echo ""
echo "📝 Default credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🚀 You can now start the services with: docker-compose up"
