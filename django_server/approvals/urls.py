from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ApprovalRequestViewSet, ApprovalNotificationView,
    MarkNotificationReadView
)

app_name = 'approvals'

router = DefaultRouter()
router.register('requests', ApprovalRequestViewSet, basename='approval_request')

urlpatterns = [
    path('', include(router.urls)),
    path('notifications/', ApprovalNotificationView.as_view(), name='notifications'),
    path('notifications/<uuid:pk>/read/', MarkNotificationReadView.as_view(), name='mark_read'),
]