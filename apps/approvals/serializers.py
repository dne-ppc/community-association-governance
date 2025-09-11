from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ApprovalRequest, ApprovalStatus
from apps.documents.models import Document

User = get_user_model()


class ApprovalRequestSerializer(serializers.ModelSerializer):
    """Serializer for ApprovalRequest model."""
    
    document = serializers.StringRelatedField(read_only=True)
    document_id = serializers.IntegerField(write_only=True)
    requested_by = serializers.StringRelatedField(read_only=True)
    reviewed_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'document', 'document_id', 'requested_by', 'status',
            'notes', 'requested_at', 'reviewed_by', 'reviewed_at'
        ]
        read_only_fields = [
            'id', 'requested_by', 'requested_at', 'reviewed_by', 'reviewed_at'
        ]
    
    def create(self, validated_data):
        """Create a new approval request."""
        validated_data['requested_by'] = self.context['request'].user
        return super().create(validated_data)


class ApprovalRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating approval requests."""
    
    class Meta:
        model = ApprovalRequest
        fields = ['document', 'notes']
    
    def validate_document(self, value):
        """Validate that the document can be requested for approval."""
        if value.status not in ['PENDING', 'UNDER_REVIEW']:
            raise serializers.ValidationError("Document is not in a state that can be approved")
        return value


class ApprovalRequestReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviewing approval requests."""
    
    class Meta:
        model = ApprovalRequest
        fields = ['status', 'notes']
    
    def validate_status(self, value):
        """Validate the review status."""
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError("Status must be either APPROVED or REJECTED")
        return value


class ApprovalRequestListSerializer(serializers.ModelSerializer):
    """Simplified serializer for approval request lists."""
    
    document = serializers.StringRelatedField(read_only=True)
    requested_by = serializers.StringRelatedField(read_only=True)
    reviewed_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'document', 'requested_by', 'status',
            'requested_at', 'reviewed_by', 'reviewed_at'
        ]