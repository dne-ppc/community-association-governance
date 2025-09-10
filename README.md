# Community Association Governance Document Management System

A comprehensive web application for managing governance documents for community associations. This system enables document creation, editing, version control, approval workflows, and PDF generation with fillable forms.

## Features

### Core Functionality
- **Document Management**: Create, edit, and organize governance documents with markdown support
- **Version Control**: Complete audit trail with diff tracking between versions
- **Approval Workflows**: Role-based approval system with email notifications
- **PDF Generation**: Generate static and fillable PDFs from documents
- **User Management**: Role-based access control with granular permissions
- **Search**: Full-text search across all documents and metadata

### User Roles
- **Admin**: Full system access and user management
- **President**: Approve all documents with full access
- **Board Member**: Create/edit documents and view all documents
- **Committee Member**: Create/edit documents in assigned categories
- **Volunteer**: View approved documents and create pending documents
- **Public**: View approved public documents only

### Document Types
- Policies and procedures
- Forms and templates with fillable fields
- Checklists and appendices
- Hierarchical categorization system

## Technology Stack

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** with Prisma ORM
- **JWT** authentication
- **Puppeteer** for PDF generation
- **Redis** for session management

### Frontend
- **React** with TypeScript
- **Material-UI** for consistent design
- **Zustand** for state management
- **React Hook Form** for form handling
- **React Router** for navigation

### Infrastructure
- **Docker** containers for deployment
- **Docker Compose** for local development
- **Nginx** for reverse proxy (production)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd community-association-dms
   ```

2. **Start the application with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Initialize the database**
   ```bash
   # The database will be automatically initialized with sample data
   # Wait for the containers to be ready (about 30-60 seconds)
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

### Default Login Credentials

The system comes with pre-configured demo accounts:

- **Admin**: `admin@community-association.com` / `admin123`
- **President**: `president@community-association.com` / `president123`
- **Board Member**: `board@community-association.com` / `board123`

## Development Setup

### Backend Development

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Seed the database**
   ```bash
   npm run seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

### Frontend Development

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Document Endpoints
- `GET /api/documents` - List documents with filtering
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/versions` - Get document versions
- `GET /api/documents/:id/diff` - Get version diff

### Category Endpoints
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Approval Endpoints
- `GET /api/approvals` - List approval requests
- `POST /api/approvals/request` - Request approval
- `PUT /api/approvals/:id/review` - Review approval
- `PUT /api/approvals/:id/cancel` - Cancel approval

### PDF Endpoints
- `GET /api/pdf/:documentId` - Generate PDF
- `GET /api/pdf/:documentId/fillable` - Generate fillable PDF
- `GET /api/pdf/:documentId/preview` - Preview PDF HTML

## Database Schema

### Core Tables
- `users` - User accounts and roles
- `documents` - Document metadata and content
- `document_versions` - Version history with diffs
- `document_categories` - Hierarchical categorization
- `approval_requests` - Approval workflow tracking
- `form_fields` - Fillable form field definitions
- `activity_logs` - Complete audit trail

## Security Features

- **JWT Authentication** with secure token management
- **Role-based Access Control** with granular permissions
- **Input Validation** using Joi schemas
- **SQL Injection Protection** via Prisma ORM
- **XSS Protection** with helmet middleware
- **CORS Configuration** for secure cross-origin requests
- **Password Hashing** using bcrypt with salt rounds

## Deployment

### Production Deployment

1. **Configure environment variables**
   ```bash
   # Update docker-compose.yml with production values
   # Set strong JWT secrets and database passwords
   ```

2. **Build and deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Set up reverse proxy** (Nginx example)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
       }
       
       location /api {
           proxy_pass http://localhost:3001;
       }
   }
   ```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/community_dms"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="production"
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
```

#### Frontend (.env)
```env
REACT_APP_API_URL="https://your-api-domain.com/api"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

## Roadmap

### Planned Features
- **Advanced Approval Workflows**: Multi-stage approvals with conditional logic
- **Collaboration Features**: Real-time editing and commenting
- **Mobile Application**: Native mobile app for document access
- **Integration APIs**: REST APIs for external system integration
- **Advanced Search**: Elasticsearch integration for better search
- **Workflow Automation**: Automated document workflows and notifications
- **Template Engine**: Advanced document template system
- **Audit Reports**: Comprehensive reporting and analytics

### Version History
- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Enhanced approval workflows (planned)
- **v1.2.0** - Mobile application (planned)
- **v2.0.0** - Advanced collaboration features (planned)