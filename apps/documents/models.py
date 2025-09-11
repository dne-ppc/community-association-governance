from django.db import models
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from apps.accounts.models import User, UserRole
from apps.categories.models import DocumentCategory

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


class Document(models.Model):
    """Document model for storing governance documents."""
    
    title = models.CharField(max_length=500)
    slug = models.SlugField(unique=True, max_length=500)
    category = models.ForeignKey(
        DocumentCategory,
        on_delete=models.CASCADE,
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
        on_delete=models.CASCADE,
        related_name='authored_documents'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_documents'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'documents'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
    
    def get_absolute_url(self):
        return f"/documents/{self.slug}/"
    
    def can_be_edited_by(self, user):
        """Check if user can edit this document."""
        if user.role == UserRole.ADMIN:
            return True
        if user == self.author:
            return self.status in [DocumentStatus.PENDING, DocumentStatus.UNDER_REVIEW]
        return False
    
    def can_be_approved_by(self, user):
        """Check if user can approve this document."""
        if user.role == UserRole.ADMIN:
            return True
        if user.role == UserRole.PRESIDENT:
            return True
        if user.role == UserRole.BOARD_MEMBER:
            return self.category.required_approval_role in [
                UserRole.BOARD_MEMBER, 
                UserRole.COMMITTEE_MEMBER, 
                UserRole.VOLUNTEER
            ]
        return False


class DocumentVersion(models.Model):
    """Document version model for tracking changes."""
    
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    content_markdown = models.TextField()
    change_description = models.TextField(blank=True, null=True)
    content_diff = models.TextField(blank=True, null=True)
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='document_versions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_versions'
        verbose_name = 'Document Version'
        verbose_name_plural = 'Document Versions'
        ordering = ['-version_number']
        unique_together = ['document', 'version_number']
    
    def __str__(self):
        return f"{self.document.title} v{self.version_number}"


class FormField(models.Model):
    """Form field model for fillable document fields."""
    
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='form_fields'
    )
    field_name = models.CharField(max_length=200)
    field_type = models.CharField(
        max_length=20,
        choices=FieldType.choices,
        default=FieldType.TEXT
    )
    position = models.PositiveIntegerField()
    required = models.BooleanField(default=False)
    placeholder_text = models.CharField(max_length=500, blank=True, null=True)
    options = models.JSONField(blank=True, null=True)  # For select/radio options
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'form_fields'
        verbose_name = 'Form Field'
        verbose_name_plural = 'Form Fields'
        ordering = ['position']
    
    def __str__(self):
        return f"{self.document.title} - {self.field_name}"


class ActivityLog(models.Model):
    """Activity log model for audit trail."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=100)
    details = models.JSONField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    
    class Meta:
        db_table = 'activity_logs'
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.full_name} - {self.action} - {self.entity_type}"