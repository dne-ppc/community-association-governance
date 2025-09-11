# Community Association DMS - Django Backend

A complete Django/Python rewrite of the Community Association Document Management System, replacing the original Node.js implementation.

## 🚀 Features

### Core Functionality
- **Document Management**: Full CRUD operations with markdown support
- **Version Control**: Complete version history with diff tracking
- **Approval Workflows**: Role-based approval system with notifications
- **PDF Generation**: Static and fillable PDF generation from documents
- **User Management**: Role-based access control (RBAC)
- **Activity Logging**: Complete audit trail of all actions
- **RESTful API**: Django REST Framework powered API
- **Admin Interface**: Full Django admin for system management

### User Roles
- **Admin**: Full system access
- **President**: Document approval and high-level access
- **Board Member**: Create/edit documents, approve certain categories
- **Committee Member**: Create/edit documents in assigned areas
- **Volunteer**: View documents, create drafts
- **Public**: View public documents only

## 🛠 Technology Stack

- **Django 5.2.6**: Web framework
- **Django REST Framework**: API development
- **PostgreSQL**: Database
- **Redis**: Caching and Celery broker
- **Celery**: Asynchronous task processing
- **JWT**: Token-based authentication
- **ReportLab**: PDF generation
- **Docker**: Containerization

## 📋 Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## 🔧 Installation

### Using Docker (Recommended)

1. **Clone the repository**
```bash
cd /workspace/django_server
```

2. **Start with Docker Compose**
```bash
docker-compose up -d
```

3. **Access the application**
- API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/
- Health Check: http://localhost:8000/health/

### Manual Installation

1. **Create virtual environment**
```bash
python3 -m venv venv
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

4. **Run migrations**
```bash
python manage.py migrate
```

5. **Seed the database**
```bash
python manage.py seed_users
python manage.py seed_documents
```

6. **Create superuser (optional)**
```bash
python manage.py createsuperuser
```

7. **Run the server**
```bash
python manage.py runserver
```

## 🔑 Default Login Credentials

After seeding, these accounts are available:

- **Admin**: `admin@community-association.com` / `admin123`
- **President**: `president@community-association.com` / `president123`
- **Board Member**: `board@community-association.com` / `board123`
- **Committee**: `committee@community-association.com` / `committee123`
- **Volunteer**: `volunteer@community-association.com` / `volunteer123`
- **Public**: `public@community-association.com` / `public123`

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "password_confirm": "securepassword",
  "first_name": "John",
  "last_name": "Doe",
  "role": "VOLUNTEER"
}
```

#### Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Returns JWT tokens:
```json
{
  "user": {...},
  "tokens": {
    "access": "eyJ...",
    "refresh": "eyJ..."
  }
}
```

#### Refresh Token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ..."
}
```

### Documents

#### List Documents
```http
GET /api/documents/
Authorization: Bearer <access_token>

Query Parameters:
- category: Filter by category ID
- status: Filter by status (PENDING, APPROVED, etc.)
- search: Search in title and content
- is_public: Filter public documents
```

#### Create Document
```http
POST /api/documents/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "New Policy",
  "category": "<category_id>",
  "content_markdown": "# Policy Content",
  "is_public": false,
  "has_fillable_fields": false,
  "tags": ["policy", "governance"]
}
```

#### Update Document
```http
PATCH /api/documents/{slug}/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content_markdown": "# Updated Content",
  "change_description": "Fixed typos"
}
```

#### Generate PDF
```http
GET /api/documents/{slug}/generate_pdf/
Authorization: Bearer <access_token>
```

#### Generate Fillable PDF
```http
GET /api/documents/{slug}/generate_fillable_pdf/
Authorization: Bearer <access_token>
```

### Approvals

#### Request Approval
```http
POST /api/approvals/requests/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "document": "<document_id>",
  "notes": "Please review",
  "priority": "HIGH"
}
```

#### Review Approval
```http
POST /api/approvals/requests/{id}/review/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "action": "approve",
  "notes": "Looks good"
}
```

### Categories

#### List Categories
```http
GET /api/categories/
Authorization: Bearer <access_token>

Query Parameters:
- parent: Filter by parent ID (use "null" for root categories)
```

## 🗂 Project Structure

```
django_server/
├── accounts/               # User management app
│   ├── models.py          # User and ActivityLog models
│   ├── serializers.py     # DRF serializers
│   ├── views.py           # API views
│   ├── urls.py            # URL routing
│   └── management/        # Management commands
├── documents/             # Document management app
│   ├── models.py          # Document, Category, Version models
│   ├── serializers.py     # DRF serializers
│   ├── views.py           # API views
│   ├── pdf_utils.py       # PDF generation utilities
│   └── management/        # Management commands
├── approvals/             # Approval workflow app
│   ├── models.py          # ApprovalRequest, Notification models
│   ├── serializers.py     # DRF serializers
│   └── views.py           # API views
├── community_dms/         # Main project directory
│   ├── settings.py        # Django settings
│   ├── urls.py            # Main URL configuration
│   ├── celery.py          # Celery configuration
│   └── wsgi.py            # WSGI application
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker container definition
├── docker-compose.yml    # Docker Compose configuration
└── .env                  # Environment variables
```

## 🔒 Security Features

- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- CORS configuration
- SQL injection protection via Django ORM
- XSS protection via Django templates
- CSRF protection
- Password validation
- Activity logging for audit trails

## 🚀 Deployment

### Production Checklist

1. **Update settings**:
   - Set `DEBUG = False`
   - Update `SECRET_KEY`
   - Configure `ALLOWED_HOSTS`
   - Set secure JWT secret

2. **Database**:
   - Use production PostgreSQL instance
   - Run migrations: `python manage.py migrate`
   - Create superuser: `python manage.py createsuperuser`

3. **Static files**:
   ```bash
   python manage.py collectstatic
   ```

4. **Use Gunicorn**:
   ```bash
   gunicorn community_dms.wsgi:application --bind 0.0.0.0:8000
   ```

5. **Set up Nginx** (example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /static/ {
           alias /path/to/staticfiles/;
       }
       
       location /media/ {
           alias /path/to/media/;
       }
       
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🧪 Testing

Run tests:
```bash
python manage.py test
```

With coverage:
```bash
coverage run --source='.' manage.py test
coverage report
```

## 📝 Management Commands

- `python manage.py seed_users` - Create default users
- `python manage.py seed_documents` - Create sample documents
- `python manage.py createsuperuser` - Create admin user
- `python manage.py migrate` - Run database migrations
- `python manage.py collectstatic` - Collect static files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆚 Comparison with Node.js Version

### Advantages of Django/Python Version

1. **Django Admin**: Built-in admin interface for easy management
2. **ORM**: Powerful Django ORM vs Prisma
3. **Batteries Included**: More built-in features
4. **Python Ecosystem**: Access to extensive Python libraries
5. **Better PDF Generation**: ReportLab provides more control
6. **Simpler Deployment**: Less dependency management issues
7. **Mature Framework**: Django's stability and conventions

### Migration Notes

- All API endpoints maintain compatibility with the React frontend
- Database schema is similar but uses Django conventions
- JWT authentication works the same way
- PDF generation improved with ReportLab
- Activity logging enhanced with Django signals

## 📞 Support

For issues or questions:
- Create an issue in the repository
- Check existing documentation
- Review Django documentation at https://docs.djangoproject.com/