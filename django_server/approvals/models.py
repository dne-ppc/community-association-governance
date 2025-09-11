from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from documents.models import Document
import uuid

User = get_user_model()


class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ApprovalRequest(models.Model):
    """Document approval workflow"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='approval_requests'
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='approval_requests_made'
    )
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )
    notes = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approval_requests_reviewed'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Additional fields for workflow
    priority = models.CharField(
        max_length=20,
        choices=[
            ('LOW', 'Low'),
            ('MEDIUM', 'Medium'),
            ('HIGH', 'High'),
            ('URGENT', 'Urgent'),
        ],
        default='MEDIUM'
    )
    due_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'approval_requests'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['document', 'status']),
            models.Index(fields=['requested_by', '-requested_at']),
            models.Index(fields=['status', '-requested_at']),
        ]
    
    def __str__(self):
        return f"{self.document.title} - {self.status}"
    
    def approve(self, user, notes=''):
        """Approve the request"""
        self.status = ApprovalStatus.APPROVED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        if notes:
            self.notes = notes
        self.save()
        
        # Update document status
        self.document.status = 'APPROVED'
        self.document.approved_by = user
        self.document.approved_at = timezone.now()
        self.document.save()
        
        # Create notification
        ApprovalNotification.objects.create(
            approval_request=self,
            recipient=self.requested_by,
            notification_type='APPROVED',
            message=f'Your document "{self.document.title}" has been approved by {user.full_name}'
        )
    
    def reject(self, user, notes):
        """Reject the request"""
        self.status = ApprovalStatus.REJECTED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.notes = notes
        self.save()
        
        # Update document status
        self.document.status = 'PENDING'
        self.document.save()
        
        # Create notification
        ApprovalNotification.objects.create(
            approval_request=self,
            recipient=self.requested_by,
            notification_type='REJECTED',
            message=f'Your document "{self.document.title}" has been rejected by {user.full_name}'
        )
    
    def cancel(self, user):
        """Cancel the request"""
        if user != self.requested_by and user.role not in ['ADMIN', 'PRESIDENT']:
            raise PermissionError("You don't have permission to cancel this request")
        
        self.status = ApprovalStatus.CANCELLED
        self.reviewed_at = timezone.now()
        self.save()
    
    def can_user_review(self, user):
        """Check if user can review this approval request"""
        if self.status != ApprovalStatus.PENDING:
            return False
        
        # Check role hierarchy
        required_role = self.document.category.required_approval_role
        return user.has_role(required_role)


class ApprovalNotification(models.Model):
    """Notifications for approval workflow"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    approval_request = models.ForeignKey(
        ApprovalRequest,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='approval_notifications'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=[
            ('REQUESTED', 'Approval Requested'),
            ('APPROVED', 'Approved'),
            ('REJECTED', 'Rejected'),
            ('CANCELLED', 'Cancelled'),
            ('REMINDER', 'Reminder'),
        ]
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'approval_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['approval_request']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} - {self.recipient.email}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class ApprovalComment(models.Model):
    """Comments on approval requests"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    approval_request = models.ForeignKey(
        ApprovalRequest,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='approval_comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'approval_comments'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.email} on {self.approval_request}"