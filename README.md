# Cloud-Native Task Manager - Complete DevOps Showcase

A production-ready microservices application demonstrating enterprise DevOps practices using **100% FREE** resources.

## 🚀 Features

- **Microservices Architecture**: 3 Go services + React frontend
- **Zero-Cost Infrastructure**: Railway, Supabase, GitHub Actions
- **Complete CI/CD Pipeline**: Automated testing, security scanning, deployment
- **Monitoring & Observability**: Grafana Cloud, Sentry, performance testing
- **Production-Ready**: SSL, CDN, auto-scaling, health checks

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Auth Service  │    │  Task Service   │
│   (React)       │◄──►│   (Port 8080)   │◄──►│  (Port 8081)    │
│   Port 3000     │    │   JWT + SQLite  │    │  CRUD + SQLite  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │Notification Svc │
                    │  (Port 8082)    │
                    │   Webhooks      │
                    └─────────────────┘
```

## 🛠️ Tech Stack

### Backend Services (Go)
- **Auth Service**: JWT authentication, user management
- **Task Service**: CRUD operations, task management
- **Notification Service**: Webhook notifications, alerts

### Frontend (React + TypeScript)
- Modern React with TypeScript
- Axios for API communication
- Environment-based configuration
- JWT token management

### Infrastructure (FREE)
- **Railway**: Container hosting (512MB RAM, $5 credit/month)
- **Supabase**: PostgreSQL database (500MB free)
- **GitHub Actions**: CI/CD pipeline
- **Grafana Cloud**: Monitoring (10k series free)
- **Sentry**: Error tracking (5k errors/month free)

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Go 1.21+

### Local Development

1. **Clone and setup**:
```bash
git clone <your-repo>
cd cloud-task-manager
```

2. **Start all services**:
```bash
docker-compose up -d
```

3. **Access the application**:
- Frontend: http://localhost:3000
- Auth Service: http://localhost:8080
- Task Service: http://localhost:8081
- Notification Service: http://localhost:8082

### Environment Configuration

The application uses environment variables for configuration:

```bash
# Frontend (.env)
REACT_APP_API_URL=http://localhost:8080
REACT_APP_TASK_API_URL=http://localhost:8081
REACT_APP_NOTIFICATION_API_URL=http://localhost:8082

# Backend services
DATABASE_URL=./data/app.db
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

## 📁 Project Structure

```
cloud-task-manager/
├── apps/
│   ├── frontend/           # React TypeScript app
│   ├── auth-service/       # Go JWT service
│   ├── task-service/       # Go CRUD service
│   └── notification-service/ # Go webhook service
├── infrastructure/
│   ├── railway/            # Railway deployment configs
│   ├── docker/             # Production Docker configs
│   └── scripts/            # Deployment scripts
├── monitoring/
│   ├── grafana/            # Monitoring dashboards
│   ├── sentry/             # Error tracking config
│   └── k6/                 # Performance tests
├── .github/workflows/      # CI/CD pipelines
├── docker-compose.yml      # Local development
└── README.md
```

## 🔧 Development

### Running Individual Services

```bash
# Auth Service
cd apps/auth-service
go run main.go

# Task Service  
cd apps/task-service
go run main.go

# Frontend
cd apps/frontend
npm start
```

### Database Management

```bash
# Initialize database
./scripts/init-db.sh

# Run migrations
./scripts/migrate.sh

# Seed data
./scripts/seed.sh
```

## 🚀 Deployment

### Railway (Recommended - FREE)

1. **Connect GitHub repository**
2. **Deploy services**:
```bash
# Each service has its own railway.toml
railway deploy
```

3. **Set environment variables** in Railway dashboard

### Alternative Platforms

- **Google Cloud Run**: Serverless containers
- **Fly.io**: Global deployment
- **Render**: Simple container hosting

## 📊 Monitoring

### Grafana Dashboards
- Service health and metrics
- Request rates and response times
- Error rates and alerts

### Sentry Error Tracking
- Real-time error monitoring
- Performance tracking
- Release tracking

### Performance Testing
- K6 load tests
- Automated performance regression testing

## 🔒 Security

- JWT-based authentication
- CORS configuration
- Security scanning in CI/CD
- Vulnerability scanning with Trivy
- CodeQL analysis

## 📈 CI/CD Pipeline

### Automated Workflows
1. **Code Quality**: Linting, formatting, testing
2. **Security**: Vulnerability scanning, dependency checks
3. **Performance**: Load testing, performance regression
4. **Deployment**: Blue-green deployments, health checks

### Environments
- **Development**: Local Docker Compose
- **Staging**: Railway preview deployments
- **Production**: Railway production deployments

## 💰 Cost Breakdown: $0.00/month

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Railway | $5 credit/month | 3 microservices |
| Supabase | 500MB PostgreSQL | Database |
| GitHub | Unlimited public repos | Code + CI/CD |
| Grafana Cloud | 10k series | Monitoring |
| Sentry | 5k errors/month | Error tracking |
| Cloudflare | Free SSL + CDN | Domain + SSL |

## 🎯 Success Criteria

- ✅ All services running locally via Docker Compose
- ✅ Frontend successfully calling backend APIs
- ✅ JWT authentication working end-to-end
- ✅ Database persistence with SQLite
- ✅ Health check endpoints responding
- ✅ CORS properly configured
- ✅ Environment variables working correctly

## 📚 Learning Outcomes

This project demonstrates:
- Microservices architecture patterns
- Container orchestration concepts
- Infrastructure as Code principles
- CI/CD best practices
- Monitoring and observability
- Security scanning and compliance
- Performance optimization
- Disaster recovery procedures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and security scans
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ using 100% FREE resources to showcase enterprise DevOps skills**
