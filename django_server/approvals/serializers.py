from rest_framework import serializers
from .models import ApprovalRequest, ApprovalNotification, ApprovalComment
from documents.serializers import DocumentListSerializer
from accounts.serializers import UserSerializer


class ApprovalCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    
    class Meta:
        model = ApprovalComment
        fields = [
            'id', 'approval_request', 'author', 'content',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ApprovalNotificationSerializer(serializers.ModelSerializer):
    approval_request_title = serializers.CharField(
        source='approval_request.document.title',
        read_only=True
    )
    
    class Meta:
        model = ApprovalNotification
        fields = [
            'id', 'approval_request', 'approval_request_title',
            'recipient', 'notification_type', 'message',
            'is_read', 'created_at', 'read_at'
        ]
        read_only_fields = ['id', 'created_at']


class ApprovalRequestListSerializer(serializers.ModelSerializer):
    document = DocumentListSerializer(read_only=True)
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'document', 'requested_by', 'status', 'notes',
            'requested_at', 'reviewed_by', 'reviewed_at',
            'priority', 'due_date'
        ]
        read_only_fields = [
            'id', 'requested_at', 'reviewed_at'
        ]


class ApprovalRequestDetailSerializer(serializers.ModelSerializer):
    document = DocumentListSerializer(read_only=True)
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    comments = ApprovalCommentSerializer(many=True, read_only=True)
    can_review = serializers.SerializerMethodField()
    
    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'document', 'requested_by', 'status', 'notes',
            'requested_at', 'reviewed_by', 'reviewed_at',
            'priority', 'due_date', 'comments', 'can_review'
        ]
        read_only_fields = [
            'id', 'requested_at', 'reviewed_at'
        ]
    
    def get_can_review(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_user_review(request.user)
        return False


class ApprovalRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRequest
        fields = [
            'document', 'notes', 'priority', 'due_date'
        ]
    
    def validate_document(self, value):
        # Check if document is already approved
        if value.status in ['APPROVED', 'LIVE']:
            raise serializers.ValidationError(
                'This document is already approved'
            )
        
        # Check if there's already a pending approval request
        if ApprovalRequest.objects.filter(
            document=value,
            status='PENDING'
        ).exists():
            raise serializers.ValidationError(
                'There is already a pending approval request for this document'
            )
        
        return value
    
    def create(self, validated_data):
        validated_data['requested_by'] = self.context['request'].user
        approval_request = ApprovalRequest.objects.create(**validated_data)
        
        # Update document status
        document = approval_request.document
        document.status = 'UNDER_REVIEW'
        document.save()
        
        # Create notifications for approvers
        # Get users who can approve this document
        required_role = document.category.required_approval_role
        from accounts.models import User
        approvers = User.objects.filter(
            role__in=self._get_approval_roles(required_role),
            is_active=True
        ).exclude(id=approval_request.requested_by.id)
        
        for approver in approvers:
            ApprovalNotification.objects.create(
                approval_request=approval_request,
                recipient=approver,
                notification_type='REQUESTED',
                message=f'New approval request for "{document.title}" from {approval_request.requested_by.full_name}'
            )
        
        return approval_request
    
    def _get_approval_roles(self, required_role):
        """Get roles that can approve based on required role"""
        role_hierarchy = {
            'PUBLIC': ['ADMIN', 'PRESIDENT', 'BOARD_MEMBER', 'COMMITTEE_MEMBER', 'VOLUNTEER'],
            'VOLUNTEER': ['ADMIN', 'PRESIDENT', 'BOARD_MEMBER', 'COMMITTEE_MEMBER'],
            'COMMITTEE_MEMBER': ['ADMIN', 'PRESIDENT', 'BOARD_MEMBER'],
            'BOARD_MEMBER': ['ADMIN', 'PRESIDENT', 'BOARD_MEMBER'],
            'PRESIDENT': ['ADMIN', 'PRESIDENT'],
            'ADMIN': ['ADMIN'],
        }
        return role_hierarchy.get(required_role, ['ADMIN'])


class ApprovalReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        if attrs['action'] == 'reject' and not attrs.get('notes'):
            raise serializers.ValidationError(
                'Notes are required when rejecting an approval request'
            )
        return attrs