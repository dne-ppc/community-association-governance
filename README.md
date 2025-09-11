# Community Association Document Management System (Django)

A comprehensive web application for managing governance documents for community associations. This system enables document creation, editing, version control, approval workflows, and PDF generation with fillable forms.

## 🚀 Features

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

## 🛠 Technology Stack

### Backend
- **Django 4.2** with Django REST Framework
- **PostgreSQL** database
- **Redis** for caching and session management
- **JWT** authentication
- **WeasyPrint** and **ReportLab** for PDF generation
- **Celery** for background tasks

### Frontend
- **React 18** with modern JavaScript
- **Bootstrap 5** for responsive design
- **Font Awesome** for icons
- **Axios** for API communication

### Infrastructure
- **Docker** containers for deployment
- **Docker Compose** for local development
- **Nginx** for reverse proxy and static file serving
- **Gunicorn** as WSGI server

## 📋 Prerequisites

- Docker and Docker Compose
- Git
- Python 3.11+ (for local development)
- PostgreSQL 15+ (for local development)
- Redis 7+ (for local development)

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd community-association-dms
   ```

2. **Start the application with Docker Compose**
   ```bash
   # For development
   docker-compose -f docker-compose.dev.yml up -d
   
   # For production
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:8000
   - Admin Interface: http://localhost:8000/admin/
   - API: http://localhost:8000/api/

### Default Login Credentials

The system comes with pre-configured demo accounts:

- **Admin**: `admin@community-association.com` / `admin123`
- **President**: `president@community-association.com` / `president123`
- **Board Member**: `board@community-association.com` / `board123`
- **Committee Member**: `committee@community-association.com` / `committee123`
- **Volunteer**: `volunteer@community-association.com` / `volunteer123`

## 🛠 Development Setup

### Local Development

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   python manage.py migrate
   python manage.py create_superuser --email admin@example.com --password admin123
   python manage.py seed_data
   ```

5. **Start development server**
   ```bash
   python manage.py runserver
   ```

### Database Management

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py create_superuser --email admin@example.com --password admin123

# Seed with sample data
python manage.py seed_data

# Access Django shell
python manage.py shell
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/` - Update user profile
- `POST /api/auth/change-password/` - Change password
- `POST /api/auth/logout/` - User logout

### Document Endpoints
- `GET /api/documents/` - List documents with filtering
- `POST /api/documents/` - Create new document
- `GET /api/documents/{id}/` - Get document details
- `PUT /api/documents/{id}/` - Update document
- `DELETE /api/documents/{id}/` - Delete document
- `GET /api/documents/{id}/versions/` - Get document versions
- `GET /api/documents/{id}/versions/{v1}/diff/{v2}/` - Get version diff
- `GET /api/documents/{id}/activity/` - Get document activity log
- `GET /api/documents/{id}/pdf/` - Generate PDF
- `GET /api/documents/{id}/pdf/fillable/` - Generate fillable PDF
- `GET /api/documents/{id}/pdf/preview/` - Preview PDF HTML
- `GET /api/documents/stats/` - Get document statistics

### Category Endpoints
- `GET /api/categories/` - List categories
- `POST /api/categories/` - Create category
- `GET /api/categories/{id}/` - Get category details
- `PUT /api/categories/{id}/` - Update category
- `DELETE /api/categories/{id}/` - Delete category
- `GET /api/categories/tree/` - Get category tree
- `GET /api/categories/stats/` - Get category statistics

### Approval Endpoints
- `GET /api/approvals/` - List approval requests
- `POST /api/approvals/` - Create approval request
- `GET /api/approvals/{id}/` - Get approval request details
- `PUT /api/approvals/{id}/` - Review approval request
- `DELETE /api/approvals/{id}/` - Cancel approval request
- `POST /api/approvals/request/{document_id}/` - Request approval for document
- `GET /api/approvals/stats/` - Get approval statistics

### User Management Endpoints
- `GET /api/users/` - List users (admin only)
- `POST /api/users/` - Create user (admin only)
- `GET /api/users/{id}/` - Get user details
- `PUT /api/users/{id}/` - Update user (admin only)
- `DELETE /api/users/{id}/` - Delete user (admin only)
- `GET /api/users/stats/` - Get user statistics (admin only)

## 🗄 Database Schema

### Core Models
- **User**: User accounts with role-based permissions
- **DocumentCategory**: Hierarchical document categorization
- **Document**: Document metadata and content
- **DocumentVersion**: Version history with diffs
- **FormField**: Fillable form field definitions
- **ApprovalRequest**: Approval workflow tracking
- **ActivityLog**: Complete audit trail

### Relationships
- Users can create multiple documents
- Documents belong to categories
- Documents have multiple versions
- Documents can have form fields
- Documents can have approval requests
- All actions are logged in ActivityLog

## 🔐 Security Features

- **JWT Authentication** with secure token management
- **Role-based Access Control** with granular permissions
- **Input Validation** using Django serializers
- **SQL Injection Protection** via Django ORM
- **XSS Protection** with Django's built-in security
- **CORS Configuration** for secure cross-origin requests
- **Password Hashing** using Django's built-in password hashing
- **Rate Limiting** via Nginx
- **Security Headers** via Nginx configuration

## 📊 Monitoring and Logging

- **Request Logging**: All API requests are logged
- **Activity Logging**: User actions are tracked
- **Error Logging**: Application errors are logged
- **Health Checks**: Docker health checks for all services
- **Performance Monitoring**: Request timing and response codes

## 🚀 Deployment

### Production Deployment

1. **Configure environment variables**
   ```bash
   # Update docker-compose.yml with production values
   # Set strong JWT secrets and database passwords
   ```

2. **Build and deploy**
   ```bash
   docker-compose up -d
   ```

3. **Set up reverse proxy** (Nginx example)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:8000;
       }
   }
   ```

### Environment Variables

#### Production (.env)
```env
DEBUG=False
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/community_dms
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-jwt-secret-here
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-smtp-user
EMAIL_HOST_PASSWORD=your-smtp-password
DEFAULT_FROM_EMAIL=noreply@your-domain.com
```

#### Development (.env)
```env
DEBUG=True
SECRET_KEY=dev-secret-key-not-for-production
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/community_dms_dev
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=dev-jwt-secret-not-for-production
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 🧪 Testing

```bash
# Run tests
python manage.py test

# Run tests with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

## 🗺 Roadmap

### Planned Features
- **Advanced Approval Workflows**: Multi-stage approvals with conditional logic
- **Collaboration Features**: Real-time editing and commenting
- **Mobile Application**: Native mobile app for document access
- **Integration APIs**: REST APIs for external system integration
- **Advanced Search**: Elasticsearch integration for better search
- **Workflow Automation**: Automated document workflows and notifications
- **Template Engine**: Advanced document template system
- **Audit Reports**: Comprehensive reporting and analytics
- **Email Notifications**: Automated email notifications for approvals
- **Document Templates**: Pre-built document templates
- **Bulk Operations**: Bulk document operations
- **Advanced Permissions**: Fine-grained permission system

### Version History
- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Enhanced approval workflows (planned)
- **v1.2.0** - Mobile application (planned)
- **v2.0.0** - Advanced collaboration features (planned)

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps
   
   # Check database logs
   docker-compose logs db
   ```

2. **Static Files Not Loading**
   ```bash
   # Collect static files
   python manage.py collectstatic --noinput
   ```

3. **Permission Issues**
   ```bash
   # Check file permissions
   ls -la
   
   # Fix permissions
   chmod -R 755 static/
   chmod -R 755 media/
   ```

4. **Redis Connection Issues**
   ```bash
   # Check Redis status
   docker-compose logs redis
   
   # Test Redis connection
   redis-cli ping
   ```

### Performance Optimization

1. **Database Optimization**
   - Use database indexes
   - Optimize queries with select_related and prefetch_related
   - Use database connection pooling

2. **Caching**
   - Enable Redis caching
   - Use Django's cache framework
   - Cache expensive operations

3. **Static Files**
   - Use CDN for static files
   - Enable gzip compression
   - Set proper cache headers

## 📞 Contact

For questions or support, please contact:
- Email: support@community-association.com
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)

---

**Community Association Document Management System** - Built with Django and React