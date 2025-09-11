from django.db import models
from django.contrib.auth import get_user_model
from apps.documents.models import Document

User = get_user_model()


class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ApprovalRequest(models.Model):
    """Approval request model for document approval workflow."""
    
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='approval_requests'
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='requested_approvals'
    )
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )
    notes = models.TextField(blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_approvals'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'approval_requests'
        verbose_name = 'Approval Request'
        verbose_name_plural = 'Approval Requests'
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"{self.document.title} - {self.status}"
    
    def can_be_reviewed_by(self, user):
        """Check if user can review this approval request."""
        if user.role == 'ADMIN':
            return True
        if user.role == 'PRESIDENT':
            return True
        if user.role == 'BOARD_MEMBER':
            return self.document.category.required_approval_role in [
                'BOARD_MEMBER', 
                'COMMITTEE_MEMBER', 
                'VOLUNTEER'
            ]
        return False
    
    def approve(self, reviewer, notes=None):
        """Approve the request."""
        self.status = ApprovalStatus.APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = models.DateTimeField(auto_now=True)
        if notes:
            self.notes = notes
        self.save()
        
        # Update document status
        self.document.status = 'APPROVED'
        self.document.approved_by = reviewer
        self.document.approved_at = self.reviewed_at
        self.document.save()
    
    def reject(self, reviewer, notes=None):
        """Reject the request."""
        self.status = ApprovalStatus.REJECTED
        self.reviewed_by = reviewer
        self.reviewed_at = models.DateTimeField(auto_now=True)
        if notes:
            self.notes = notes
        self.save()
        
        # Update document status
        self.document.status = 'PENDING'
        self.document.save()
    
    def cancel(self, user):
        """Cancel the request."""
        if user == self.requested_by or user.role == 'ADMIN':
            self.status = ApprovalStatus.CANCELLED
            self.reviewed_by = user
            self.reviewed_at = models.DateTimeField(auto_now=True)
            self.save()
            
            # Update document status
            self.document.status = 'PENDING'
            self.document.save()