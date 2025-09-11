import logging
from django.contrib.auth import get_user_model
from django.db.models import Q
from apps.documents.models import Document, ActivityLog

User = get_user_model()
logger = logging.getLogger(__name__)


def log_activity(user, action, entity_type, entity_id, details=None, ip_address=None):
    """Log user activity for audit trail."""
    try:
        ActivityLog.objects.create(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address
        )
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")


def get_client_ip(request):
    """Get the client IP address from the request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def can_user_access_document(user, document):
    """Check if user can access a specific document."""
    if user.can_view_all_documents():
        return True
    
    if document.is_public:
        return True
    
    if document.author == user:
        return True
    
    return False


def get_user_accessible_documents(user):
    """Get documents that a user can access."""
    if user.can_view_all_documents():
        return Document.objects.all()
    
    return Document.objects.filter(
        Q(is_public=True) | Q(author=user)
    )


def generate_slug(title, model_class, exclude_id=None):
    """Generate a unique slug for a given title."""
    from django.utils.text import slugify
    
    base_slug = slugify(title)
    slug = base_slug
    counter = 1
    
    while True:
        query = model_class.objects.filter(slug=slug)
        if exclude_id:
            query = query.exclude(id=exclude_id)
        
        if not query.exists():
            break
        
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug


def send_notification_email(user, subject, message, html_message=None):
    """Send notification email to user."""
    from django.core.mail import send_mail
    from django.conf import settings
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Notification email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send notification email to {user.email}: {e}")


def notify_approval_request(approval_request):
    """Send notification for new approval request."""
    from apps.accounts.models import UserRole
    
    # Get users who can approve this document
    approvers = User.objects.filter(
        role__in=[UserRole.ADMIN, UserRole.PRESIDENT, UserRole.BOARD_MEMBER],
        active=True
    )
    
    subject = f"New Approval Request: {approval_request.document.title}"
    message = f"""
    A new approval request has been submitted for the document "{approval_request.document.title}".
    
    Requested by: {approval_request.requested_by.full_name}
    Document: {approval_request.document.title}
    Category: {approval_request.document.category.name}
    
    Please review the document and approve or reject the request.
    """
    
    for approver in approvers:
        send_notification_email(approver, subject, message)


def notify_approval_decision(approval_request):
    """Send notification for approval decision."""
    subject = f"Approval Decision: {approval_request.document.title}"
    
    if approval_request.status == 'APPROVED':
        message = f"""
        Your approval request for the document "{approval_request.document.title}" has been approved.
        
        Reviewed by: {approval_request.reviewed_by.full_name}
        Status: Approved
        
        The document is now live and available to users.
        """
    else:
        message = f"""
        Your approval request for the document "{approval_request.document.title}" has been rejected.
        
        Reviewed by: {approval_request.reviewed_by.full_name}
        Status: Rejected
        
        Please review the feedback and make necessary changes before resubmitting.
        """
    
    if approval_request.notes:
        message += f"\n\nNotes: {approval_request.notes}"
    
    send_notification_email(approval_request.requested_by, subject, message)