from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole
from apps.categories.models import DocumentCategory
from apps.documents.models import Document, DocumentStatus

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with initial data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database with initial data...')

        # Create users
        self.create_users()
        
        # Create categories
        self.create_categories()
        
        # Create sample documents
        self.create_documents()

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded database')
        )

    def create_users(self):
        """Create sample users."""
        users_data = [
            {
                'email': 'president@community-association.com',
                'password': 'president123',
                'first_name': 'John',
                'last_name': 'Smith',
                'role': UserRole.PRESIDENT
            },
            {
                'email': 'board@community-association.com',
                'password': 'board123',
                'first_name': 'Jane',
                'last_name': 'Doe',
                'role': UserRole.BOARD_MEMBER
            },
            {
                'email': 'committee@community-association.com',
                'password': 'committee123',
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'role': UserRole.COMMITTEE_MEMBER
            },
            {
                'email': 'volunteer@community-association.com',
                'password': 'volunteer123',
                'first_name': 'Alice',
                'last_name': 'Williams',
                'role': UserRole.VOLUNTEER
            }
        ]

        for user_data in users_data:
            if not User.objects.filter(email=user_data['email']).exists():
                User.objects.create_user(**user_data)
                self.stdout.write(f'Created user: {user_data["email"]}')

    def create_categories(self):
        """Create sample categories."""
        categories_data = [
            {
                'name': 'Policies and Procedures',
                'description': 'General policies and procedures for the community',
                'required_approval_role': UserRole.PRESIDENT
            },
            {
                'name': 'Forms and Templates',
                'description': 'Standard forms and document templates',
                'required_approval_role': UserRole.BOARD_MEMBER
            },
            {
                'name': 'Meeting Minutes',
                'description': 'Board and committee meeting minutes',
                'required_approval_role': UserRole.BOARD_MEMBER
            },
            {
                'name': 'Financial Documents',
                'description': 'Financial reports and budget documents',
                'required_approval_role': UserRole.PRESIDENT
            },
            {
                'name': 'Maintenance Guidelines',
                'description': 'Property maintenance and repair guidelines',
                'required_approval_role': UserRole.COMMITTEE_MEMBER
            }
        ]

        for category_data in categories_data:
            if not DocumentCategory.objects.filter(name=category_data['name']).exists():
                DocumentCategory.objects.create(**category_data)
                self.stdout.write(f'Created category: {category_data["name"]}')

    def create_documents(self):
        """Create sample documents."""
        # Get a sample user and category
        author = User.objects.filter(role=UserRole.BOARD_MEMBER).first()
        category = DocumentCategory.objects.first()

        if not author or not category:
            self.stdout.write('Skipping document creation - no author or category found')
            return

        documents_data = [
            {
                'title': 'Community Association Bylaws',
                'content_markdown': '''# Community Association Bylaws

## Article I: Name and Purpose

The name of this organization shall be the Community Association.

### Purpose
The purpose of this association is to:
- Maintain and improve the community
- Enforce community standards
- Manage common areas
- Represent the interests of all residents

## Article II: Membership

All property owners within the community are automatically members of the association.

### Rights and Responsibilities
Members have the right to:
- Vote on association matters
- Access common areas
- Receive association communications

Members are responsible for:
- Paying association fees
- Following community rules
- Maintaining their property''',
                'status': DocumentStatus.LIVE,
                'is_public': True
            },
            {
                'title': 'Property Maintenance Request Form',
                'content_markdown': '''# Property Maintenance Request Form

Please complete this form to request maintenance services for your property.

## Property Information
- Property Address: _________________
- Unit Number: _________________
- Contact Information: _________________

## Maintenance Request Details
- Type of Maintenance: _________________
- Description of Issue: _________________
- Urgency Level: [ ] Low [ ] Medium [ ] High
- Preferred Date: _________________

## Additional Information
Please provide any additional details that may help with the maintenance request:

_________________________________
_________________________________

**Note:** All maintenance requests are subject to approval and scheduling based on availability.''',
                'status': DocumentStatus.APPROVED,
                'is_public': True,
                'has_fillable_fields': True
            },
            {
                'title': 'Board Meeting Minutes - January 2024',
                'content_markdown': '''# Board Meeting Minutes
**Date:** January 15, 2024  
**Time:** 7:00 PM  
**Location:** Community Center

## Attendees
- John Smith (President)
- Jane Doe (Board Member)
- Bob Johnson (Board Member)
- Alice Williams (Secretary)

## Agenda Items

### 1. Financial Report
- Monthly budget review
- Outstanding fees discussion
- Reserve fund status

### 2. Maintenance Updates
- Pool maintenance schedule
- Landscaping improvements
- Parking lot repairs

### 3. New Business
- Community event planning
- Rule enforcement updates
- Resident feedback

## Action Items
1. Schedule pool maintenance for February
2. Review landscaping contractor proposals
3. Update community rules document
4. Plan spring community event

## Next Meeting
**Date:** February 19, 2024  
**Time:** 7:00 PM  
**Location:** Community Center''',
                'status': DocumentStatus.PENDING,
                'is_public': False
            }
        ]

        for doc_data in documents_data:
            if not Document.objects.filter(title=doc_data['title']).exists():
                Document.objects.create(
                    author=author,
                    category=category,
                    **doc_data
                )
                self.stdout.write(f'Created document: {doc_data["title"]}')