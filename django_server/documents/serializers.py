from rest_framework import serializers
from .models import Document, DocumentCategory, DocumentVersion, FormField
from accounts.serializers import UserSerializer


class DocumentCategorySerializer(serializers.ModelSerializer):
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentCategory
        fields = [
            'id', 'name', 'parent', 'description', 'required_approval_role',
            'full_path', 'children', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_children(self, obj):
        children = obj.children.all()
        return DocumentCategorySerializer(children, many=True).data


class FormFieldSerializer(serializers.ModelSerializer):
    options_list = serializers.ListField(source='get_options_list', read_only=True)
    
    class Meta:
        model = FormField
        fields = [
            'id', 'document', 'field_name', 'field_type', 'position',
            'required', 'placeholder_text', 'options', 'options_list',
            'validation_rules', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentVersionSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    
    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'document', 'version_number', 'content_markdown',
            'change_description', 'content_diff', 'author', 'created_at'
        ]
        read_only_fields = ['id', 'version_number', 'content_diff', 'created_at']


class DocumentListSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'slug', 'category', 'category_name', 'status',
            'is_public', 'has_fillable_fields', 'author', 'approved_by_name',
            'approved_at', 'created_at', 'updated_at', 'tags'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class DocumentDetailSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    approved_by = UserSerializer(read_only=True)
    category = DocumentCategorySerializer(read_only=True)
    form_fields = FormFieldSerializer(many=True, read_only=True)
    latest_version = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_view = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'slug', 'category', 'status', 'content_markdown',
            'is_public', 'has_fillable_fields', 'author', 'approved_by',
            'approved_at', 'created_at', 'updated_at', 'tags', 'metadata',
            'form_fields', 'latest_version', 'can_edit', 'can_view'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'approved_at']
    
    def get_latest_version(self, obj):
        version = obj.get_latest_version()
        if version:
            return DocumentVersionSerializer(version).data
        return None
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_user_edit(request.user)
        return False
    
    def get_can_view(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_user_view(request.user)
        return obj.is_public


class DocumentCreateSerializer(serializers.ModelSerializer):
    form_fields = FormFieldSerializer(many=True, required=False)
    
    class Meta:
        model = Document
        fields = [
            'title', 'category', 'content_markdown', 'is_public',
            'has_fillable_fields', 'tags', 'metadata', 'form_fields'
        ]
    
    def create(self, validated_data):
        form_fields_data = validated_data.pop('form_fields', [])
        document = Document.objects.create(**validated_data)
        
        # Create form fields if provided
        for field_data in form_fields_data:
            FormField.objects.create(document=document, **field_data)
        
        # Create initial version
        document.create_version(
            author=validated_data['author'],
            change_description='Initial version'
        )
        
        return document


class DocumentUpdateSerializer(serializers.ModelSerializer):
    change_description = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Document
        fields = [
            'title', 'category', 'content_markdown', 'is_public',
            'has_fillable_fields', 'status', 'tags', 'metadata',
            'change_description'
        ]
    
    def update(self, instance, validated_data):
        change_description = validated_data.pop('change_description', None)
        
        # Check if content has changed
        content_changed = (
            'content_markdown' in validated_data and
            validated_data['content_markdown'] != instance.content_markdown
        )
        
        # Update the document
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Create a new version if content changed
        if content_changed:
            instance.create_version(
                author=self.context['request'].user,
                change_description=change_description or 'Content updated'
            )
        
        return instance