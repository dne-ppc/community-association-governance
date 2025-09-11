from django.urls import path
from . import views, pdf_views

app_name = 'documents'

urlpatterns = [
    # Document endpoints
    path('', views.DocumentListView.as_view(), name='document_list'),
    path('<int:pk>/', views.DocumentDetailView.as_view(), name='document_detail'),
    path('stats/', views.document_stats, name='document_stats'),
    
    # Document version endpoints
    path('<int:document_id>/versions/', views.DocumentVersionListView.as_view(), name='document_version_list'),
    path('<int:document_id>/versions/<int:pk>/', views.DocumentVersionDetailView.as_view(), name='document_version_detail'),
    path('<int:document_id>/versions/<int:version1_id>/diff/<int:version2_id>/', views.document_diff, name='document_version_diff'),
    
    # Activity log endpoints
    path('<int:document_id>/activity/', views.document_activity_log, name='document_activity_log'),
    
    # PDF generation endpoints
    path('<int:document_id>/pdf/', pdf_views.generate_pdf, name='generate_pdf'),
    path('<int:document_id>/pdf/fillable/', pdf_views.generate_fillable_pdf, name='generate_fillable_pdf'),
    path('<int:document_id>/pdf/preview/', pdf_views.preview_pdf_html, name='preview_pdf_html'),
]