from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Document, DocumentVersion, FormField, ActivityLog, DocumentStatus, FieldType
from apps.accounts.models import UserRole
from apps.categories.models import DocumentCategory

User = get_user_model()


class FormFieldSerializer(serializers.ModelSerializer):
    """Serializer for FormField model."""
    
    class Meta:
        model = FormField
        fields = [
            'id', 'field_name', 'field_type', 'position',
            'required', 'placeholder_text', 'options'
        ]


class DocumentVersionSerializer(serializers.ModelSerializer):
    """Serializer for DocumentVersion model."""
    
    author = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'version_number', 'content_markdown',
            'change_description', 'content_diff', 'author', 'created_at'
        ]
        read_only_fields = ['id', 'version_number', 'author', 'created_at']


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model."""
    
    author = serializers.StringRelatedField(read_only=True)
    approver = serializers.StringRelatedField(read_only=True)
    category = serializers.StringRelatedField(read_only=True)
    category_id = serializers.IntegerField(write_only=True)
    form_fields = FormFieldSerializer(many=True, read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'slug', 'category', 'category_id', 'status',
            'content_markdown', 'is_public', 'has_fillable_fields',
            'author', 'approved_by', 'approved_at', 'created_at', 'updated_at',
            'form_fields', 'versions'
        ]
        read_only_fields = [
            'id', 'slug', 'author', 'approved_by', 'approved_at',
            'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        """Create a new document."""
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class DocumentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating documents."""
    
    form_fields = FormFieldSerializer(many=True, required=False)
    
    class Meta:
        model = Document
        fields = [
            'title', 'category', 'content_markdown', 'is_public',
            'has_fillable_fields', 'form_fields'
        ]
    
    def create(self, validated_data):
        """Create a new document with form fields."""
        form_fields_data = validated_data.pop('form_fields', [])
        validated_data['author'] = self.context['request'].user
        
        document = Document.objects.create(**validated_data)
        
        # Create form fields
        for field_data in form_fields_data:
            FormField.objects.create(document=document, **field_data)
        
        return document


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating documents."""
    
    form_fields = FormFieldSerializer(many=True, required=False)
    change_description = serializers.CharField(required=False)
    
    class Meta:
        model = Document
        fields = [
            'title', 'content_markdown', 'is_public',
            'has_fillable_fields', 'form_fields', 'change_description'
        ]
    
    def update(self, instance, validated_data):
        """Update document and create new version."""
        form_fields_data = validated_data.pop('form_fields', [])
        change_description = validated_data.pop('change_description', '')
        
        # Create version before updating
        if 'content_markdown' in validated_data:
            # Get the next version number
            last_version = instance.versions.order_by('-version_number').first()
            version_number = (last_version.version_number + 1) if last_version else 1
            
            # Create new version
            DocumentVersion.objects.create(
                document=instance,
                version_number=version_number,
                content_markdown=instance.content_markdown,
                change_description=change_description,
                author=self.context['request'].user
            )
        
        # Update the document
        document = super().update(instance, validated_data)
        
        # Update form fields if provided
        if form_fields_data:
            # Delete existing form fields
            instance.form_fields.all().delete()
            
            # Create new form fields
            for field_data in form_fields_data:
                FormField.objects.create(document=instance, **field_data)
        
        return document


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for ActivityLog model."""
    
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'action', 'entity_type', 'entity_id',
            'details', 'ip_address', 'timestamp'
        ]
        read_only_fields = ['id', 'user', 'timestamp']


class DocumentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for document lists."""
    
    author = serializers.StringRelatedField(read_only=True)
    category = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'slug', 'category', 'status',
            'author', 'created_at', 'updated_at', 'is_public'
        ]