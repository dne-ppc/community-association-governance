from rest_framework import serializers
from .models import DocumentCategory
from apps.accounts.models import UserRole


class DocumentCategorySerializer(serializers.ModelSerializer):
    """Serializer for DocumentCategory model."""
    
    full_path = serializers.ReadOnlyField()
    document_count = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentCategory
        fields = [
            'id', 'name', 'parent', 'description', 'required_approval_role',
            'created_at', 'updated_at', 'full_path', 'document_count', 'children'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_document_count(self, obj):
        """Get the number of documents in this category."""
        return obj.get_document_count()
    
    def get_children(self, obj):
        """Get child categories."""
        children = obj.children.all()
        return DocumentCategorySerializer(children, many=True).data


class DocumentCategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating document categories."""
    
    class Meta:
        model = DocumentCategory
        fields = [
            'name', 'parent', 'description', 'required_approval_role'
        ]
    
    def validate_parent(self, value):
        """Validate parent category."""
        if value and value == self.instance:
            raise serializers.ValidationError("A category cannot be its own parent")
        return value


class DocumentCategoryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating document categories."""
    
    class Meta:
        model = DocumentCategory
        fields = [
            'name', 'parent', 'description', 'required_approval_role'
        ]
    
    def validate_parent(self, value):
        """Validate parent category."""
        if value and value == self.instance:
            raise serializers.ValidationError("A category cannot be its own parent")
        return value


class DocumentCategoryTreeSerializer(serializers.ModelSerializer):
    """Serializer for category tree structure."""
    
    children = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentCategory
        fields = [
            'id', 'name', 'description', 'required_approval_role',
            'document_count', 'children'
        ]
    
    def get_children(self, obj):
        """Get child categories recursively."""
        children = obj.children.all()
        return DocumentCategoryTreeSerializer(children, many=True).data
    
    def get_document_count(self, obj):
        """Get the number of documents in this category."""
        return obj.get_document_count()