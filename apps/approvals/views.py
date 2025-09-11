from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import ApprovalRequest
from .serializers import (
    ApprovalRequestSerializer, ApprovalRequestCreateSerializer,
    ApprovalRequestReviewSerializer, ApprovalRequestListSerializer
)
from apps.documents.models import Document


class ApprovalRequestListView(generics.ListCreateAPIView):
    """List and create approval requests."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ApprovalRequestCreateSerializer
        return ApprovalRequestListSerializer
    
    def get_queryset(self):
        """Filter approval requests based on user permissions."""
        user = self.request.user
        
        if user.can_approve_documents():
            # Users who can approve can see all requests
            return ApprovalRequest.objects.select_related(
                'document', 'requested_by', 'reviewed_by'
            ).all()
        else:
            # Regular users can only see their own requests
            return ApprovalRequest.objects.select_related(
                'document', 'requested_by', 'reviewed_by'
            ).filter(requested_by=user)
    
    def perform_create(self, serializer):
        """Create a new approval request."""
        document = serializer.validated_data['document']
        
        # Check if user can request approval for this document
        if not document.can_be_edited_by(self.request.user):
            raise permissions.PermissionDenied("You don't have permission to request approval for this document")
        
        # Check if there's already a pending request
        existing_request = ApprovalRequest.objects.filter(
            document=document,
            status='PENDING'
        ).exists()
        
        if existing_request:
            raise permissions.PermissionDenied("There is already a pending approval request for this document")
        
        serializer.save()


class ApprovalRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete an approval request."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ApprovalRequestReviewSerializer
        return ApprovalRequestSerializer
    
    def get_queryset(self):
        """Filter approval requests based on user permissions."""
        user = self.request.user
        
        if user.can_approve_documents():
            return ApprovalRequest.objects.select_related(
                'document', 'requested_by', 'reviewed_by'
            ).all()
        else:
            return ApprovalRequest.objects.select_related(
                'document', 'requested_by', 'reviewed_by'
            ).filter(requested_by=user)
    
    def perform_update(self, serializer):
        """Update approval request."""
        approval_request = self.get_object()
        
        # Check if user can review this request
        if not approval_request.can_be_reviewed_by(self.request.user):
            raise permissions.PermissionDenied("You don't have permission to review this approval request")
        
        # Check if request is still pending
        if approval_request.status != 'PENDING':
            raise permissions.PermissionDenied("This approval request has already been reviewed")
        
        # Update the request
        serializer.save(reviewed_by=self.request.user)
        
        # Update document status based on approval
        if serializer.validated_data['status'] == 'APPROVED':
            approval_request.approve(self.request.user, serializer.validated_data.get('notes'))
        elif serializer.validated_data['status'] == 'REJECTED':
            approval_request.reject(self.request.user, serializer.validated_data.get('notes'))
    
    def perform_destroy(self, instance):
        """Cancel approval request."""
        if not (instance.requested_by == self.request.user or self.request.user.role == 'ADMIN'):
            raise permissions.PermissionDenied("You don't have permission to cancel this approval request")
        
        if instance.status != 'PENDING':
            raise permissions.PermissionDenied("Only pending approval requests can be cancelled")
        
        instance.cancel(self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def approval_stats(request):
    """Get approval statistics."""
    user = request.user
    
    if user.can_approve_documents():
        # Users who can approve see all stats
        stats = {
            'total_requests': ApprovalRequest.objects.count(),
            'pending_requests': ApprovalRequest.objects.filter(status='PENDING').count(),
            'approved_requests': ApprovalRequest.objects.filter(status='APPROVED').count(),
            'rejected_requests': ApprovalRequest.objects.filter(status='REJECTED').count(),
            'cancelled_requests': ApprovalRequest.objects.filter(status='CANCELLED').count(),
            'requests_by_status': {},
            'recent_requests': ApprovalRequestListSerializer(
                ApprovalRequest.objects.select_related(
                    'document', 'requested_by', 'reviewed_by'
                ).order_by('-requested_at')[:10],
                many=True
            ).data
        }
        
        # Count by status
        for status, _ in ApprovalRequest.ApprovalStatus.choices:
            stats['requests_by_status'][status] = ApprovalRequest.objects.filter(status=status).count()
    
    else:
        # Regular users see their own stats
        user_requests = ApprovalRequest.objects.filter(requested_by=user)
        stats = {
            'my_requests': user_requests.count(),
            'my_pending_requests': user_requests.filter(status='PENDING').count(),
            'my_approved_requests': user_requests.filter(status='APPROVED').count(),
            'my_rejected_requests': user_requests.filter(status='REJECTED').count(),
            'my_cancelled_requests': user_requests.filter(status='CANCELLED').count(),
            'my_requests_by_status': {},
            'recent_requests': ApprovalRequestListSerializer(
                user_requests.select_related(
                    'document', 'requested_by', 'reviewed_by'
                ).order_by('-requested_at')[:10],
                many=True
            ).data
        }
        
        for status, _ in ApprovalRequest.ApprovalStatus.choices:
            stats['my_requests_by_status'][status] = user_requests.filter(status=status).count()
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def request_approval(request, document_id):
    """Request approval for a specific document."""
    document = get_object_or_404(Document, id=document_id)
    
    # Check if user can request approval for this document
    if not document.can_be_edited_by(request.user):
        raise permissions.PermissionDenied("You don't have permission to request approval for this document")
    
    # Check if there's already a pending request
    existing_request = ApprovalRequest.objects.filter(
        document=document,
        status='PENDING'
    ).exists()
    
    if existing_request:
        return Response(
            {'error': 'There is already a pending approval request for this document'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create the approval request
    approval_request = ApprovalRequest.objects.create(
        document=document,
        requested_by=request.user,
        notes=request.data.get('notes', '')
    )
    
    # Update document status
    document.status = 'UNDER_REVIEW'
    document.save()
    
    serializer = ApprovalRequestSerializer(approval_request)
    return Response(serializer.data, status=status.HTTP_201_CREATED)