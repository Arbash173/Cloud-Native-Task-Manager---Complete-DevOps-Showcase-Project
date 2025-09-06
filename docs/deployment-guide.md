# Task Manager - Deployment Guide

This guide covers deploying the Task Manager application using **100% FREE** resources across multiple environments.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Go 1.21+
- Railway account (free)
- GitHub account

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

## 🌐 FREE Cloud Deployment

### Railway Deployment (Recommended)

Railway offers the best free tier for microservices:
- **512MB RAM** per service
- **$5 credit monthly** (covers 3-4 small services)
- **PostgreSQL included**
- **Auto SSL certificates**
- **GitHub integration**

#### Step 1: Setup Railway

1. **Create Railway account**: https://railway.app
2. **Connect GitHub repository**
3. **Install Railway CLI**:
```bash
curl -fsSL https://railway.app/install.sh | sh
```

#### Step 2: Deploy Services

1. **Login to Railway**:
```bash
railway login
```

2. **Deploy each service**:
```bash
# Deploy auth service
cd apps/auth-service
cp ../../infrastructure/railway/auth-service.toml railway.toml
railway up --service auth-service

# Deploy task service
cd ../task-service
cp ../../infrastructure/railway/task-service.toml railway.toml
railway up --service task-service

# Deploy notification service
cd ../notification-service
cp ../../infrastructure/railway/notification-service.toml railway.toml
railway up --service notification-service

# Deploy frontend
cd ../frontend
cp ../../infrastructure/railway/frontend.toml railway.toml
railway up --service frontend
```

#### Step 3: Configure Environment Variables

Set these environment variables in Railway dashboard:

```bash
# Security
RAILWAY_JWT_SECRET=your-super-secret-jwt-key-for-production

# CORS
RAILWAY_CORS_ORIGINS=https://your-frontend-domain.railway.app

# Service URLs (Railway will provide these)
RAILWAY_AUTH_SERVICE_URL=https://your-auth-service.railway.app
RAILWAY_TASK_SERVICE_URL=https://your-task-service.railway.app
RAILWAY_NOTIFICATION_SERVICE_URL=https://your-notification-service.railway.app
```

### Alternative Platforms

#### Google Cloud Run

```bash
# Build and deploy to Cloud Run
gcloud run deploy auth-service \
  --image gcr.io/$PROJECT/auth:$GITHUB_SHA \
  --platform managed --region us-central1 \
  --allow-unauthenticated
```

#### Fly.io

```bash
# Deploy to Fly.io
fly deploy --config fly.toml
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

The project includes a comprehensive CI/CD pipeline:

1. **Security Scanning**: Trivy vulnerability scanner
2. **Code Quality**: CodeQL analysis
3. **Testing**: Frontend and backend tests
4. **Building**: Docker images
5. **Deployment**: Railway deployment
6. **Performance Testing**: K6 load tests

#### Required Secrets

Add these secrets to your GitHub repository:

```bash
# Railway
RAILWAY_TOKEN=your-railway-token

# Container Registry
GITHUB_TOKEN=your-github-token

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
GRAFANA_API_KEY=your-grafana-api-key
```

### Pipeline Stages

1. **Security Scan**: Vulnerability scanning with Trivy
2. **Frontend Test**: React tests with coverage
3. **Backend Test**: Go tests with race detection
4. **Build & Push**: Docker images to GitHub Container Registry
5. **Deploy**: Railway deployment
6. **Health Check**: Service health verification
7. **Performance Test**: K6 load testing

## 📊 Monitoring & Observability

### Grafana Cloud (FREE)

1. **Create Grafana Cloud account**: https://grafana.com/products/cloud/
2. **Import dashboards**: Use the provided JSON files in `monitoring/grafana/`
3. **Configure alerts**: Set up alerting rules

### Sentry (FREE)

1. **Create Sentry account**: https://sentry.io
2. **Get DSN**: Copy your project DSN
3. **Configure**: Add DSN to environment variables

### Prometheus Metrics

All services expose Prometheus metrics at `/metrics`:

- **HTTP Requests**: Request count, duration, status codes
- **Database**: Connection metrics
- **Authentication**: Login/register attempts
- **System**: Memory usage, CPU metrics

## 🛠️ Development Workflow

### Local Development

```bash
# Start all services
docker-compose up -d

# Run health checks
./infrastructure/scripts/health-check.sh

# Run tests
cd apps/frontend && npm test
cd apps/auth-service && go test ./...
```

### Staging Deployment

```bash
# Deploy to staging
./infrastructure/scripts/deploy.sh -e staging -b

# Run performance tests
docker run --rm -v $PWD/monitoring/k6:/scripts grafana/k6 run /scripts/load-test.js
```

### Production Deployment

```bash
# Blue-green deployment
./infrastructure/scripts/blue-green-deploy.sh -e production

# Monitor deployment
./infrastructure/scripts/health-check.sh -e production
```

## 🔒 Security

### Environment Variables

Never commit sensitive data. Use environment variables:

```bash
# Required for production
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=your-database-url
CORS_ORIGINS=your-allowed-origins

# Optional for monitoring
SENTRY_DSN=your-sentry-dsn
GRAFANA_API_KEY=your-grafana-key
```

### Security Scanning

The CI/CD pipeline includes:

- **Trivy**: Container vulnerability scanning
- **CodeQL**: Code analysis for security issues
- **Dependency scanning**: Automated dependency updates

## 📈 Performance

### Load Testing

Run K6 performance tests:

```bash
# Load test
docker run --rm -v $PWD/monitoring/k6:/scripts grafana/k6 run /scripts/load-test.js

# Stress test
docker run --rm -v $PWD/monitoring/k6:/scripts grafana/k6 run /scripts/stress-test.js
```

### Monitoring

Monitor your application with:

- **Grafana Dashboards**: Real-time metrics
- **Sentry**: Error tracking and performance
- **Railway Metrics**: Built-in platform metrics

## 🚨 Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   docker-compose logs [service-name]
   ```

2. **Health checks failing**:
   ```bash
   ./infrastructure/scripts/health-check.sh -e local
   ```

3. **Deployment issues**:
   ```bash
   railway logs [service-name]
   ```

### Debug Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Test API endpoints
curl http://localhost:8080/health
curl http://localhost:8080/metrics

# Database inspection
sqlite3 ./data/auth.db ".tables"
```

## 💰 Cost Breakdown

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Railway | $5 credit | $0.00 |
| GitHub | Unlimited repos | $0.00 |
| Grafana Cloud | 10k series | $0.00 |
| Sentry | 5k errors | $0.00 |
| **Total** | | **$0.00** |

## 🎯 Success Criteria

- ✅ All services running locally via Docker Compose
- ✅ Frontend successfully calling backend APIs
- ✅ JWT authentication working end-to-end
- ✅ Database persistence with SQLite
- ✅ Health check endpoints responding
- ✅ CORS properly configured
- ✅ Environment variables working correctly
- ✅ CI/CD pipeline deploying to production
- ✅ Monitoring and alerting configured
- ✅ Performance testing integrated

## 📚 Next Steps

1. **Custom Domain**: Add custom domain with Cloudflare (free)
2. **Database Migration**: Move to PostgreSQL for production
3. **Advanced Monitoring**: Set up custom metrics and alerts
4. **Security Hardening**: Implement additional security measures
5. **Scaling**: Configure auto-scaling policies

---

**Built with ❤️ using 100% FREE resources to showcase enterprise DevOps skills**
