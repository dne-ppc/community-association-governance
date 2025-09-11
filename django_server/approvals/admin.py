from django.contrib import admin
from .models import ApprovalRequest, ApprovalNotification, ApprovalComment


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['document', 'requested_by', 'status', 'priority', 'requested_at', 'reviewed_by', 'reviewed_at']
    list_filter = ['status', 'priority', 'requested_at', 'reviewed_at']
    search_fields = ['document__title', 'requested_by__email', 'reviewed_by__email', 'notes']
    date_hierarchy = 'requested_at'
    ordering = ['-requested_at']
    
    fieldsets = (
        ('Request Information', {
            'fields': ('document', 'requested_by', 'status', 'priority', 'due_date')
        }),
        ('Review', {
            'fields': ('reviewed_by', 'reviewed_at', 'notes')
        }),
    )
    
    readonly_fields = ['requested_at', 'reviewed_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('document', 'requested_by', 'reviewed_by')


@admin.register(ApprovalNotification)
class ApprovalNotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'notification_type', 'approval_request', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['recipient__email', 'message', 'approval_request__document__title']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['approval_request', 'recipient', 'notification_type', 'message', 'created_at', 'read_at']
    
    def has_add_permission(self, request):
        return False
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('approval_request', 'recipient')


@admin.register(ApprovalComment)
class ApprovalCommentAdmin(admin.ModelAdmin):
    list_display = ['approval_request', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['approval_request__document__title', 'author__email', 'content']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('approval_request', 'author')