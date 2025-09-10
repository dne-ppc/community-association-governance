# Community Association Governance Document Management System

A comprehensive web application for managing governance documents for community associations with document creation, editing, version control, approval workflows, and PDF generation with fillable forms.

## 🚀 Features

### Core Functionality
- **Document Management**: Create, edit, and organize governance documents with markdown support
- **Version Control**: Complete version history with diff tracking and rollback capabilities
- **Approval Workflow**: Multi-stage approval process with role-based permissions
- **PDF Generation**: Generate static and fillable PDFs from documents
- **Search & Discovery**: Full-text search across all documents
- **User Management**: Role-based access control with 6 user levels
- **Real-time Notifications**: In-app and email notifications for document updates

### User Roles
- **Admin**: Full system access and user management
- **President**: Approve all documents, full document access
- **Board Member**: Create/edit documents, view all documents
- **Committee Member**: Create/edit documents in assigned categories
- **Volunteer**: View approved documents, create pending documents
- **Public**: View approved public documents only

## 🛠️ Technology Stack

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Puppeteer for PDF generation
- Nodemailer for email notifications

### Frontend
- React with TypeScript
- Material-UI components
- Redux Toolkit for state management
- Markdown editor with live preview
- React PDF viewer

### Infrastructure
- Docker containerization
- Nginx reverse proxy
- Redis caching (optional)
- Automated backups

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)
- Git

## 🚀 Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/your-org/governance-doc-system.git
cd governance-doc-system
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` file with your configuration

4. Start the application:
```bash
make setup-dev  # For development
# OR
make setup-prod # For production
```

5. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:5000
- Database Admin: http://localhost:8080 (development only)

### Manual Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Set up PostgreSQL database:
```bash
psql -U postgres < database/schema.sql
```

4. Configure environment variables:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

5. Start backend server:
```bash
cd backend
npm run dev
```

6. Start frontend development server:
```bash
cd frontend
npm start
```

## 📁 Project Structure

```
governance-doc-system/
├── backend/               # Node.js Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Authentication, error handling
│   │   ├── utils/        # Helper functions
│   │   └── config/       # Database configuration
│   ├── uploads/          # File uploads
│   └── logs/            # Application logs
├── frontend/             # React TypeScript application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── store/       # Redux store
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
├── database/            # Database schemas and migrations
├── docker/              # Docker configurations
├── nginx/               # Nginx configuration
└── docker-compose.yml   # Docker Compose configuration
```

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=governance_docs
DB_USER=postgres
DB_PASSWORD=your_password

# Security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Document Endpoints
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document details
- `POST /api/documents` - Create document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Approval Endpoints
- `GET /api/approvals` - List approval requests
- `POST /api/approvals` - Create approval request
- `PUT /api/approvals/:id` - Approve/reject document

### PDF Generation
- `GET /api/pdf/generate/:documentId` - Generate PDF
- `GET /api/pdf/preview/:documentId` - Preview PDF

## 🧪 Testing

Run tests with:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Using Make
make test
```

## 📊 Database Schema

Key tables:
- `users` - User accounts and roles
- `documents` - Document content and metadata
- `document_versions` - Version history
- `approval_requests` - Approval workflow
- `form_fields` - Fillable form field definitions
- `notifications` - User notifications
- `activity_log` - Audit trail

## 🚢 Deployment

### Production Deployment

1. Configure production environment variables
2. Set up SSL certificates in `nginx/ssl/`
3. Update nginx configuration for HTTPS
4. Build and deploy:

```bash
make build
make prod
```

### Backup and Restore

Create backup:
```bash
make backup
```

Restore from backup:
```bash
make restore
# Enter backup filename when prompted
```

## 🔐 Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens for authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- HTTPS in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core document management
- ✅ Version control
- ✅ Approval workflow
- ✅ PDF generation
- ✅ User management

### Phase 2 (Planned)
- [ ] Advanced approval workflows
- [ ] Real-time collaboration
- [ ] Mobile application
- [ ] Advanced analytics
- [ ] Template library
- [ ] API integrations

## 🙏 Acknowledgments

Built with modern open-source technologies and best practices for community association governance management.