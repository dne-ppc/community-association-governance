from django.db import models
from django.utils.text import slugify
from django.contrib.auth import get_user_model
import uuid
import json
from diff_match_patch import diff_match_patch

User = get_user_model()


class DocumentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    APPROVED = 'APPROVED', 'Approved'
    LIVE = 'LIVE', 'Live'
    ARCHIVED = 'ARCHIVED', 'Archived'


class FieldType(models.TextChoices):
    TEXT = 'TEXT', 'Text'
    EMAIL = 'EMAIL', 'Email'
    DATE = 'DATE', 'Date'
    CHECKBOX = 'CHECKBOX', 'Checkbox'
    RADIO = 'RADIO', 'Radio'
    SELECT = 'SELECT', 'Select'
    SIGNATURE = 'SIGNATURE', 'Signature'
    TEXTAREA = 'TEXTAREA', 'Textarea'


class DocumentCategory(models.Model):
    """Hierarchical categorization for documents"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )
    description = models.TextField(blank=True)
    required_approval_role = models.CharField(
        max_length=20,
        choices=User._meta.get_field('role').choices,
        default='PRESIDENT'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'document_categories'
        ordering = ['name']
        verbose_name_plural = 'Document Categories'
        indexes = [
            models.Index(fields=['parent']),
        ]
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name
    
    def get_full_path(self):
        """Get the full category path"""
        path = [self.name]
        parent = self.parent
        while parent:
            path.insert(0, parent.name)
            parent = parent.parent
        return ' > '.join(path)


class Document(models.Model):
    """Main document model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, unique=True, db_index=True)
    category = models.ForeignKey(
        DocumentCategory,
        on_delete=models.PROTECT,
        related_name='documents'
    )
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING
    )
    content_markdown = models.TextField()
    is_public = models.BooleanField(default=False)
    has_fillable_fields = models.BooleanField(default=False)
    author = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='authored_documents'
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_documents'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional metadata
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['author']),
        ]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.generate_unique_slug()
        super().save(*args, **kwargs)
    
    def generate_unique_slug(self):
        """Generate a unique slug for the document"""
        slug = slugify(self.title)
        unique_slug = slug
        num = 1
        while Document.objects.filter(slug=unique_slug).exists():
            unique_slug = f"{slug}-{num}"
            num += 1
        return unique_slug
    
    def create_version(self, author, change_description=None):
        """Create a new version of the document"""
        # Get the last version number
        last_version = self.versions.order_by('-version_number').first()
        version_number = (last_version.version_number + 1) if last_version else 1
        
        # Calculate diff if there's a previous version
        content_diff = None
        if last_version:
            dmp = diff_match_patch()
            diffs = dmp.diff_main(last_version.content_markdown, self.content_markdown)
            content_diff = dmp.diff_prettyHtml(diffs)
        
        # Create the version
        version = DocumentVersion.objects.create(
            document=self,
            version_number=version_number,
            content_markdown=self.content_markdown,
            change_description=change_description,
            content_diff=content_diff,
            author=author
        )
        return version
    
    def get_latest_version(self):
        """Get the latest version of the document"""
        return self.versions.order_by('-version_number').first()
    
    def can_user_edit(self, user):
        """Check if a user can edit this document"""
        if user.role in ['ADMIN', 'PRESIDENT']:
            return True
        if self.author == user:
            return True
        if user.role == 'BOARD_MEMBER':
            return True
        if user.role == 'COMMITTEE_MEMBER' and self.status == DocumentStatus.PENDING:
            return True
        return False
    
    def can_user_view(self, user):
        """Check if a user can view this document"""
        if self.is_public:
            return True
        if user.is_authenticated:
            if user.role != 'PUBLIC':
                return True
        return False


class DocumentVersion(models.Model):
    """Version history for documents"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    content_markdown = models.TextField()
    change_description = models.TextField(blank=True)
    content_diff = models.TextField(blank=True)
    author = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='document_versions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_versions'
        ordering = ['-version_number']
        unique_together = [['document', 'version_number']]
        indexes = [
            models.Index(fields=['document', '-version_number']),
        ]
    
    def __str__(self):
        return f"{self.document.title} - v{self.version_number}"


class FormField(models.Model):
    """Fillable form fields for documents"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='form_fields'
    )
    field_name = models.CharField(max_length=100)
    field_type = models.CharField(
        max_length=20,
        choices=FieldType.choices
    )
    position = models.PositiveIntegerField()
    required = models.BooleanField(default=False)
    placeholder_text = models.CharField(max_length=200, blank=True)
    options = models.JSONField(null=True, blank=True)  # For select/radio options
    validation_rules = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'form_fields'
        ordering = ['position']
        indexes = [
            models.Index(fields=['document', 'position']),
        ]
    
    def __str__(self):
        return f"{self.document.title} - {self.field_name}"
    
    def get_options_list(self):
        """Get options as a list for select/radio fields"""
        if self.options and isinstance(self.options, (list, str)):
            if isinstance(self.options, str):
                return json.loads(self.options)
            return self.options
        return []