from django.urls import path
from . import views

app_name = 'approvals'

urlpatterns = [
    path('', views.ApprovalRequestListView.as_view(), name='approval_list'),
    path('<int:pk>/', views.ApprovalRequestDetailView.as_view(), name='approval_detail'),
    path('stats/', views.approval_stats, name='approval_stats'),
    path('request/<int:document_id>/', views.request_approval, name='request_approval'),
]