.PHONY: help install build up down restart logs clean test migrate seed

# Default target
help:
	@echo "Community Association Governance Document Management System"
	@echo ""
	@echo "Available commands:"
	@echo "  make install    - Install all dependencies"
	@echo "  make build      - Build Docker images"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs"
	@echo "  make clean      - Clean up containers and volumes"
	@echo "  make test       - Run tests"
	@echo "  make migrate    - Run database migrations"
	@echo "  make seed       - Seed database with sample data"
	@echo "  make dev        - Start in development mode"
	@echo "  make prod       - Start in production mode"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Dependencies installed successfully!"

# Build Docker images
build:
	@echo "Building Docker images..."
	docker-compose build --no-cache
	@echo "Docker images built successfully!"

# Start services
up:
	@echo "Starting services..."
	docker-compose up -d
	@echo "Services started! Access the application at http://localhost"

# Start in development mode
dev:
	@echo "Starting in development mode..."
	docker-compose --profile development up

# Start in production mode
prod:
	@echo "Starting in production mode..."
	docker-compose up -d

# Stop services
down:
	@echo "Stopping services..."
	docker-compose down
	@echo "Services stopped!"

# Restart services
restart:
	@echo "Restarting services..."
	docker-compose restart
	@echo "Services restarted!"

# View logs
logs:
	docker-compose logs -f

# View specific service logs
logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f postgres

# Clean up
clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v
	@echo "Cleanup complete!"

# Run database migrations
migrate:
	@echo "Running database migrations..."
	docker-compose exec backend npm run migrate
	@echo "Migrations complete!"

# Seed database
seed:
	@echo "Seeding database..."
	docker-compose exec backend npm run seed
	@echo "Database seeded!"

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && npm test
	@echo "Running frontend tests..."
	cd frontend && npm test

# Database backup
backup:
	@echo "Creating database backup..."
	docker-compose exec postgres pg_dump -U postgres governance_docs > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created!"

# Database restore
restore:
	@echo "Restoring database from backup..."
	@read -p "Enter backup filename: " backup_file; \
	docker-compose exec -T postgres psql -U postgres governance_docs < $$backup_file
	@echo "Database restored!"

# Check service health
health:
	@echo "Checking service health..."
	@curl -f http://localhost/health || echo "Nginx: Not responding"
	@curl -f http://localhost:5000/api/health || echo "Backend: Not responding"
	@curl -f http://localhost:3000 || echo "Frontend: Not responding"
	@docker-compose exec postgres pg_isready || echo "Database: Not responding"

# Development setup
setup-dev:
	@echo "Setting up development environment..."
	cp .env.example .env
	make install
	make build
	make up
	make migrate
	make seed
	@echo "Development environment ready!"

# Production setup
setup-prod:
	@echo "Setting up production environment..."
	@read -p "Enter database password: " db_pass; \
	@read -p "Enter JWT secret: " jwt_secret; \
	@read -p "Enter session secret: " session_secret; \
	echo "DB_PASSWORD=$$db_pass" > .env; \
	echo "JWT_SECRET=$$jwt_secret" >> .env; \
	echo "SESSION_SECRET=$$session_secret" >> .env; \
	cat .env.example | grep -v "DB_PASSWORD\|JWT_SECRET\|SESSION_SECRET" >> .env
	make build
	make prod
	make migrate
	@echo "Production environment ready!"