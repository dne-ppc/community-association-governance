from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from documents.models import DocumentCategory, Document, FormField, FieldType
from accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with initial document categories and sample documents'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding document categories...')
        
        # Create main categories
        governance = DocumentCategory.objects.get_or_create(
            name='Governance Policies',
            defaults={
                'description': 'High-level governance and policy documents',
                'required_approval_role': UserRole.PRESIDENT
            }
        )[0]
        
        operational = DocumentCategory.objects.get_or_create(
            name='Operational Procedures',
            defaults={
                'description': 'Day-to-day operational procedures and guidelines',
                'required_approval_role': UserRole.BOARD_MEMBER
            }
        )[0]
        
        financial = DocumentCategory.objects.get_or_create(
            name='Financial Accountability',
            defaults={
                'description': 'Financial policies and procedures',
                'required_approval_role': UserRole.PRESIDENT
            }
        )[0]
        
        forms = DocumentCategory.objects.get_or_create(
            name='Forms & Templates',
            defaults={
                'description': 'Fillable forms and document templates',
                'required_approval_role': UserRole.BOARD_MEMBER
            }
        )[0]
        
        # Create subcategories
        conflict_cat = DocumentCategory.objects.get_or_create(
            name='Conflict of Interest Policy',
            parent=governance,
            defaults={
                'description': 'Policies related to conflict of interest management',
                'required_approval_role': UserRole.PRESIDENT
            }
        )[0]
        
        conduct_cat = DocumentCategory.objects.get_or_create(
            name='Code of Conduct Policy',
            parent=governance,
            defaults={
                'description': 'Code of conduct and behavioral policies',
                'required_approval_role': UserRole.PRESIDENT
            }
        )[0]
        
        volunteer_cat = DocumentCategory.objects.get_or_create(
            name='Volunteer Development Program',
            parent=operational,
            defaults={
                'description': 'Volunteer management and development procedures',
                'required_approval_role': UserRole.BOARD_MEMBER
            }
        )[0]
        
        conflict_form_cat = DocumentCategory.objects.get_or_create(
            name='Conflict of Interest Disclosure Form',
            parent=forms,
            defaults={
                'description': 'Form for disclosing potential conflicts of interest',
                'required_approval_role': UserRole.BOARD_MEMBER
            }
        )[0]
        
        volunteer_form_cat = DocumentCategory.objects.get_or_create(
            name='Volunteer Interest Form',
            parent=forms,
            defaults={
                'description': 'Form for volunteer applications and interests',
                'required_approval_role': UserRole.BOARD_MEMBER
            }
        )[0]
        
        self.stdout.write(self.style.SUCCESS('Created document categories'))
        
        # Create sample documents
        self.stdout.write('Creating sample documents...')
        
        # Get an admin user for authoring
        admin_user = User.objects.filter(role=UserRole.ADMIN).first()
        if not admin_user:
            self.stdout.write(self.style.WARNING('No admin user found. Please run seed_users first.'))
            return
        
        # Create Conflict of Interest Policy document
        if not Document.objects.filter(slug='conflict-of-interest-policy').exists():
            coi_doc = Document.objects.create(
                title='Conflict of Interest Policy',
                category=conflict_cat,
                author=admin_user,
                status='APPROVED',
                is_public=True,
                content_markdown="""# Conflict of Interest Policy

## Purpose
This policy is designed to help directors, officers, and employees of the Community Association identify situations that present potential conflicts of interest.

## Policy Statement
All directors, officers, and employees have an obligation to:
1. Avoid conflicts of interest where possible
2. Disclose any potential conflicts
3. Abstain from decision-making where conflicts exist

## Definitions
A conflict of interest arises when an individual's personal interests interfere or appear to interfere with the interests of the organization.

## Procedures
1. **Annual Disclosure**: All board members must complete an annual disclosure form
2. **Transaction Review**: Any transaction involving a potential conflict must be reviewed
3. **Documentation**: All conflicts and resolutions must be documented

## Violations
Violations of this policy may result in disciplinary action, up to and including termination or removal from the board.
"""
            )
            coi_doc.approved_by = admin_user
            coi_doc.save()
            coi_doc.create_version(admin_user, 'Initial version')
            self.stdout.write(self.style.SUCCESS('Created Conflict of Interest Policy'))
        
        # Create Code of Conduct document
        if not Document.objects.filter(slug='code-of-conduct').exists():
            conduct_doc = Document.objects.create(
                title='Code of Conduct',
                category=conduct_cat,
                author=admin_user,
                status='APPROVED',
                is_public=True,
                content_markdown="""# Code of Conduct

## Our Commitment
We are committed to providing a welcoming and inspiring community for all.

## Expected Behavior
- Be respectful and considerate
- Be collaborative
- Be professional
- Be supportive and helpful

## Unacceptable Behavior
- Harassment or discrimination
- Violent threats or language
- Personal attacks
- Publishing private information

## Reporting
Please report any violations to the board of directors immediately.

## Enforcement
Violations will be reviewed and may result in temporary or permanent exclusion from community activities.
"""
            )
            conduct_doc.approved_by = admin_user
            conduct_doc.save()
            conduct_doc.create_version(admin_user, 'Initial version')
            self.stdout.write(self.style.SUCCESS('Created Code of Conduct'))
        
        # Create Volunteer Interest Form with fillable fields
        if not Document.objects.filter(slug='volunteer-interest-form').exists():
            volunteer_form = Document.objects.create(
                title='Volunteer Interest Form',
                category=volunteer_form_cat,
                author=admin_user,
                status='APPROVED',
                is_public=True,
                has_fillable_fields=True,
                content_markdown="""# Volunteer Interest Form

Thank you for your interest in volunteering with our Community Association!

Please complete this form to help us match your skills and interests with our volunteer opportunities.

## Personal Information
Your contact details will be kept confidential and used only for volunteer coordination.

## Areas of Interest
Select the areas where you would like to contribute.

## Availability
Let us know when you're available to volunteer.

## Skills and Experience
Share any relevant skills or experience that might be helpful.
"""
            )
            volunteer_form.approved_by = admin_user
            volunteer_form.save()
            
            # Add form fields
            FormField.objects.create(
                document=volunteer_form,
                field_name='Full Name',
                field_type=FieldType.TEXT,
                position=1,
                required=True,
                placeholder_text='Enter your full name'
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Email Address',
                field_type=FieldType.EMAIL,
                position=2,
                required=True,
                placeholder_text='your.email@example.com'
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Phone Number',
                field_type=FieldType.TEXT,
                position=3,
                required=False,
                placeholder_text='(555) 123-4567'
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Areas of Interest',
                field_type=FieldType.SELECT,
                position=4,
                required=True,
                options=['Event Planning', 'Fundraising', 'Communications', 'Maintenance', 'Administration', 'Other']
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Availability',
                field_type=FieldType.SELECT,
                position=5,
                required=True,
                options=['Weekdays', 'Weekends', 'Evenings', 'Flexible']
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Previous Volunteer Experience',
                field_type=FieldType.TEXTAREA,
                position=6,
                required=False,
                placeholder_text='Please describe any relevant volunteer experience'
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Agreement',
                field_type=FieldType.CHECKBOX,
                position=7,
                required=True,
                placeholder_text='I agree to the volunteer terms and conditions'
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Date',
                field_type=FieldType.DATE,
                position=8,
                required=True
            )
            
            FormField.objects.create(
                document=volunteer_form,
                field_name='Signature',
                field_type=FieldType.SIGNATURE,
                position=9,
                required=True
            )
            
            volunteer_form.create_version(admin_user, 'Initial version with form fields')
            self.stdout.write(self.style.SUCCESS('Created Volunteer Interest Form with fillable fields'))
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded documents'))