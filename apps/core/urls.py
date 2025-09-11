from django.urls import path
from django.views.generic import TemplateView

app_name = 'core'

urlpatterns = [
    # Frontend routes - serve the main React app
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('dashboard/', TemplateView.as_view(template_name='index.html'), name='dashboard'),
    path('documents/', TemplateView.as_view(template_name='index.html'), name='documents'),
    path('documents/<str:slug>/', TemplateView.as_view(template_name='index.html'), name='document_detail'),
    path('documents/<str:slug>/edit/', TemplateView.as_view(template_name='index.html'), name='document_edit'),
    path('documents/new/', TemplateView.as_view(template_name='index.html'), name='document_new'),
    path('categories/', TemplateView.as_view(template_name='index.html'), name='categories'),
    path('approvals/', TemplateView.as_view(template_name='index.html'), name='approvals'),
    path('users/', TemplateView.as_view(template_name='index.html'), name='users'),
    path('profile/', TemplateView.as_view(template_name='index.html'), name='profile'),
    path('login/', TemplateView.as_view(template_name='index.html'), name='login'),
]