from django.contrib import admin
from .models import Document, DocumentVersion, FormField, ActivityLog


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ('version_number', 'created_at')
    fields = ('version_number', 'content_markdown', 'change_description', 'author', 'created_at')


class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 0
    fields = ('field_name', 'field_type', 'position', 'required', 'placeholder_text')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """Admin interface for Document model."""
    
    list_display = ('title', 'category', 'status', 'author', 'created_at', 'is_public')
    list_filter = ('status', 'category', 'is_public', 'has_fillable_fields', 'created_at')
    search_fields = ('title', 'content_markdown', 'author__email', 'author__first_name', 'author__last_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'category', 'status')
        }),
        ('Content', {
            'fields': ('content_markdown', 'is_public', 'has_fillable_fields')
        }),
        ('Approval', {
            'fields': ('author', 'approved_by', 'approved_at')
        }),
    )
    
    readonly_fields = ('slug', 'created_at', 'updated_at', 'approved_at')
    inlines = [DocumentVersionInline, FormFieldInline]
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related(
            'category', 'author', 'approved_by'
        )


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    """Admin interface for DocumentVersion model."""
    
    list_display = ('document', 'version_number', 'author', 'created_at')
    list_filter = ('created_at', 'author')
    search_fields = ('document__title', 'author__email')
    ordering = ('-created_at',)
    
    readonly_fields = ('created_at',)


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    """Admin interface for FormField model."""
    
    list_display = ('document', 'field_name', 'field_type', 'position', 'required')
    list_filter = ('field_type', 'required', 'created_at')
    search_fields = ('document__title', 'field_name')
    ordering = ('document', 'position')
    
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    """Admin interface for ActivityLog model."""
    
    list_display = ('user', 'action', 'entity_type', 'entity_id', 'timestamp')
    list_filter = ('action', 'entity_type', 'timestamp')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'action')
    ordering = ('-timestamp',)
    
    readonly_fields = ('timestamp',)
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user', 'document')