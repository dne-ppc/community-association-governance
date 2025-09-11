"""
URL configuration for community_dms project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    """Health check endpoint."""
    return JsonResponse({
        'status': 'OK',
        'timestamp': '2024-01-01T00:00:00Z',  # This will be replaced with actual timestamp
        'environment': settings.DEBUG and 'development' or 'production'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/categories/', include('apps.categories.urls')),
    path('api/approvals/', include('apps.approvals.urls')),
    path('api/users/', include('apps.accounts.user_urls')),
    path('', include('apps.core.urls')),  # Frontend routes
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)