from django.contrib import admin
from .models import ApprovalRequest


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    """Admin interface for ApprovalRequest model."""
    
    list_display = ('document', 'requested_by', 'status', 'requested_at', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'requested_at', 'reviewed_at')
    search_fields = (
        'document__title', 
        'requested_by__email', 
        'requested_by__first_name', 
        'requested_by__last_name',
        'reviewed_by__email'
    )
    ordering = ('-requested_at',)
    
    fieldsets = (
        (None, {
            'fields': ('document', 'requested_by', 'status')
        }),
        ('Review', {
            'fields': ('reviewed_by', 'reviewed_at', 'notes')
        }),
    )
    
    readonly_fields = ('requested_at', 'reviewed_at')
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related(
            'document', 'requested_by', 'reviewed_by'
        )