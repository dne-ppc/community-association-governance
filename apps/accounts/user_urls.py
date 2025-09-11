from django.urls import path
from . import views

app_name = 'user_management'

urlpatterns = [
    path('', views.UserListView.as_view(), name='user_list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('stats/', views.user_stats, name='user_stats'),
]