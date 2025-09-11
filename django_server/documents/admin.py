from django.contrib import admin
from .models import Document, DocumentCategory, DocumentVersion, FormField


@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'required_approval_role', 'created_at']
    list_filter = ['required_approval_role', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('parent')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'category', 'status', 'author', 'is_public', 'created_at']
    list_filter = ['status', 'is_public', 'has_fillable_fields', 'created_at', 'category']
    search_fields = ['title', 'slug', 'content_markdown', 'tags']
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'category', 'status')
        }),
        ('Content', {
            'fields': ('content_markdown', 'tags', 'metadata')
        }),
        ('Settings', {
            'fields': ('is_public', 'has_fillable_fields')
        }),
        ('Approval', {
            'fields': ('author', 'approved_by', 'approved_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'approved_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('category', 'author', 'approved_by')
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = request.user
        super().save_model(request, obj, form, change)
        
        # Create version if content changed
        if change and 'content_markdown' in form.changed_data:
            obj.create_version(
                author=request.user,
                change_description=f'Updated via admin by {request.user.email}'
            )


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ['document', 'version_number', 'author', 'created_at', 'change_description']
    list_filter = ['created_at']
    search_fields = ['document__title', 'change_description', 'content_markdown']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['document', 'version_number', 'content_markdown', 'content_diff', 'author', 'created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('document', 'author')


class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 0
    fields = ['field_name', 'field_type', 'position', 'required', 'placeholder_text', 'options']
    ordering = ['position']


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = ['document', 'field_name', 'field_type', 'position', 'required']
    list_filter = ['field_type', 'required']
    search_fields = ['document__title', 'field_name']
    ordering = ['document', 'position']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('document')


# Add inline form fields to Document admin
DocumentAdmin.inlines = [FormFieldInline]