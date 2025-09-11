from rest_framework import generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from .models import ApprovalRequest, ApprovalNotification, ApprovalComment
from .serializers import (
    ApprovalRequestListSerializer, ApprovalRequestDetailSerializer,
    ApprovalRequestCreateSerializer, ApprovalReviewSerializer,
    ApprovalNotificationSerializer, ApprovalCommentSerializer
)
from accounts.models import ActivityLog


class ApprovalPermission(permissions.BasePermission):
    """Custom permission for approval requests"""
    
    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user.is_authenticated:
            return False
        
        # Anyone can view their own requests
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only document authors can create approval requests
        if request.method == 'POST':
            return request.user.can_create_documents()
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Requester can always view their own request
        if obj.requested_by == request.user:
            return True
        
        # Reviewers can view and update
        if obj.can_user_review(request.user):
            return True
        
        # Admins can do anything
        return request.user.role == 'ADMIN'


class ApprovalRequestViewSet(ModelViewSet):
    """Approval request CRUD operations"""
    queryset = ApprovalRequest.objects.all()
    permission_classes = [ApprovalPermission]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ApprovalRequestListSerializer
        elif self.action == 'create':
            return ApprovalRequestCreateSerializer
        return ApprovalRequestDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter based on user role
        if user.role not in ['ADMIN', 'PRESIDENT']:
            # Non-admins see their own requests and ones they can review
            from django.db.models import Q
            queryset = queryset.filter(
                Q(requested_by=user) |
                Q(document__category__required_approval_role__in=self._get_reviewable_roles(user))
            )
        
        # Apply filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        requested_by = self.request.query_params.get('requested_by')
        if requested_by:
            queryset = queryset.filter(requested_by_id=requested_by)
        
        reviewed_by = self.request.query_params.get('reviewed_by')
        if reviewed_by:
            queryset = queryset.filter(reviewed_by_id=reviewed_by)
        
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by document
        document = self.request.query_params.get('document')
        if document:
            queryset = queryset.filter(document_id=document)
        
        return queryset.distinct()
    
    def _get_reviewable_roles(self, user):
        """Get roles that the user can review"""
        role_map = {
            'COMMITTEE_MEMBER': ['PUBLIC', 'VOLUNTEER'],
            'BOARD_MEMBER': ['PUBLIC', 'VOLUNTEER', 'COMMITTEE_MEMBER', 'BOARD_MEMBER'],
            'PRESIDENT': ['PUBLIC', 'VOLUNTEER', 'COMMITTEE_MEMBER', 'BOARD_MEMBER', 'PRESIDENT'],
            'ADMIN': ['PUBLIC', 'VOLUNTEER', 'COMMITTEE_MEMBER', 'BOARD_MEMBER', 'PRESIDENT', 'ADMIN'],
        }
        return role_map.get(user.role, [])
    
    def perform_create(self, serializer):
        approval_request = serializer.save()
        
        # Log activity
        ActivityLog.objects.create(
            user=self.request.user,
            action='APPROVAL_REQUESTED',
            entity_type='ApprovalRequest',
            entity_id=str(approval_request.id),
            details={
                'document_id': str(approval_request.document.id),
                'document_title': approval_request.document.title
            }
        )
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Review an approval request"""
        approval_request = self.get_object()
        
        # Check if user can review
        if not approval_request.can_user_review(request.user):
            return Response(
                {'error': 'You do not have permission to review this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ApprovalReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')
        
        if action == 'approve':
            approval_request.approve(request.user, notes)
            action_type = 'APPROVAL_APPROVED'
        else:
            approval_request.reject(request.user, notes)
            action_type = 'APPROVAL_REJECTED'
        
        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action=action_type,
            entity_type='ApprovalRequest',
            entity_id=str(approval_request.id),
            details={
                'document_id': str(approval_request.document.id),
                'document_title': approval_request.document.title,
                'notes': notes
            }
        )
        
        serializer = ApprovalRequestDetailSerializer(
            approval_request,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an approval request"""
        approval_request = self.get_object()
        
        try:
            approval_request.cancel(request.user)
        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action='APPROVAL_CANCELLED',
            entity_type='ApprovalRequest',
            entity_id=str(approval_request.id),
            details={
                'document_id': str(approval_request.document.id),
                'document_title': approval_request.document.title
            }
        )
        
        serializer = ApprovalRequestDetailSerializer(
            approval_request,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to an approval request"""
        approval_request = self.get_object()
        
        serializer = ApprovalCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        comment = ApprovalComment.objects.create(
            approval_request=approval_request,
            author=request.user,
            content=serializer.validated_data['content']
        )
        
        return Response(
            ApprovalCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED
        )


class ApprovalNotificationView(generics.ListAPIView):
    """View user notifications"""
    serializer_class = ApprovalNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ApprovalNotification.objects.filter(
            recipient=self.request.user
        )
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Filter by type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        return queryset


class MarkNotificationReadView(generics.UpdateAPIView):
    """Mark notification as read"""
    queryset = ApprovalNotification.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        notification = self.get_object()
        
        # Check if user owns the notification
        if notification.recipient != request.user:
            return Response(
                {'error': 'You can only mark your own notifications as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        notification.mark_as_read()
        
        return Response({'message': 'Notification marked as read'})