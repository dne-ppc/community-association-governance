from django.contrib import admin
from .models import DocumentCategory


@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    """Admin interface for DocumentCategory model."""
    
    list_display = ('name', 'parent', 'required_approval_role', 'created_at')
    list_filter = ('required_approval_role', 'created_at', 'parent')
    search_fields = ('name', 'description')
    ordering = ('name',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'parent', 'description')
        }),
        ('Approval Settings', {
            'fields': ('required_approval_role',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('parent')