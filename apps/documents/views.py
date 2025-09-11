from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Document, DocumentVersion, FormField, ActivityLog
from .serializers import (
    DocumentSerializer, DocumentCreateSerializer, DocumentUpdateSerializer,
    DocumentListSerializer, DocumentVersionSerializer, ActivityLogSerializer
)
from apps.accounts.models import UserRole


class DocumentListView(generics.ListCreateAPIView):
    """List and create documents."""
    
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'is_public', 'author']
    search_fields = ['title', 'content_markdown']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentCreateSerializer
        return DocumentListSerializer
    
    def get_queryset(self):
        """Filter documents based on user permissions."""
        user = self.request.user
        
        if user.can_view_all_documents():
            return Document.objects.select_related('author', 'category').all()
        else:
            # Users can only see public documents or their own documents
            return Document.objects.select_related('author', 'category').filter(
                Q(is_public=True) | Q(author=user)
            )
    
    def perform_create(self, serializer):
        """Create a new document."""
        if not self.request.user.can_create_documents():
            raise permissions.PermissionDenied("You don't have permission to create documents")
        serializer.save()


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a document."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DocumentUpdateSerializer
        return DocumentSerializer
    
    def get_queryset(self):
        """Filter documents based on user permissions."""
        user = self.request.user
        
        if user.can_view_all_documents():
            return Document.objects.select_related('author', 'category', 'approved_by').prefetch_related('form_fields', 'versions')
        else:
            return Document.objects.select_related('author', 'category', 'approved_by').prefetch_related('form_fields', 'versions').filter(
                Q(is_public=True) | Q(author=user)
            )
    
    def perform_update(self, serializer):
        """Update document."""
        document = self.get_object()
        if not document.can_be_edited_by(self.request.user):
            raise permissions.PermissionDenied("You don't have permission to edit this document")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete document."""
        if not instance.can_be_edited_by(self.request.user):
            raise permissions.PermissionDenied("You don't have permission to delete this document")
        instance.delete()


class DocumentVersionListView(generics.ListAPIView):
    """List document versions."""
    
    serializer_class = DocumentVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get versions for a specific document."""
        document_id = self.kwargs['document_id']
        document = get_object_or_404(Document, id=document_id)
        
        # Check if user can view this document
        user = self.request.user
        if not (user.can_view_all_documents() or document.is_public or document.author == user):
            raise permissions.PermissionDenied("You don't have permission to view this document")
        
        return DocumentVersion.objects.filter(document=document).select_related('author')


class DocumentVersionDetailView(generics.RetrieveAPIView):
    """Retrieve a specific document version."""
    
    serializer_class = DocumentVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get versions for a specific document."""
        document_id = self.kwargs['document_id']
        document = get_object_or_404(Document, id=document_id)
        
        # Check if user can view this document
        user = self.request.user
        if not (user.can_view_all_documents() or document.is_public or document.author == user):
            raise permissions.PermissionDenied("You don't have permission to view this document")
        
        return DocumentVersion.objects.filter(document=document).select_related('author')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_diff(request, document_id, version1_id, version2_id):
    """Get diff between two document versions."""
    document = get_object_or_404(Document, id=document_id)
    
    # Check if user can view this document
    user = request.user
    if not (user.can_view_all_documents() or document.is_public or document.author == user):
        raise permissions.PermissionDenied("You don't have permission to view this document")
    
    version1 = get_object_or_404(DocumentVersion, id=version1_id, document=document)
    version2 = get_object_or_404(DocumentVersion, id=version2_id, document=document)
    
    # Simple diff implementation (you might want to use a proper diff library)
    content1 = version1.content_markdown
    content2 = version2.content_markdown
    
    # This is a simplified diff - in production, you'd want to use a proper diff library
    diff = {
        'version1': {
            'id': version1.id,
            'version_number': version1.version_number,
            'content': content1,
            'created_at': version1.created_at
        },
        'version2': {
            'id': version2.id,
            'version_number': version2.version_number,
            'content': content2,
            'created_at': version2.created_at
        },
        'diff': content1 != content2
    }
    
    return Response(diff)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_activity_log(request, document_id):
    """Get activity log for a document."""
    document = get_object_or_404(Document, id=document_id)
    
    # Check if user can view this document
    user = request.user
    if not (user.can_view_all_documents() or document.is_public or document.author == user):
        raise permissions.PermissionDenied("You don't have permission to view this document")
    
    activities = ActivityLog.objects.filter(
        document=document
    ).select_related('user').order_by('-timestamp')
    
    serializer = ActivityLogSerializer(activities, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_stats(request):
    """Get document statistics."""
    user = request.user
    
    if user.can_view_all_documents():
        # Admin/President/Board Member can see all stats
        stats = {
            'total_documents': Document.objects.count(),
            'documents_by_status': {},
            'documents_by_category': {},
            'recent_documents': DocumentListSerializer(
                Document.objects.select_related('author', 'category').order_by('-created_at')[:5],
                many=True
            ).data
        }
        
        # Count by status
        for status, _ in Document.DocumentStatus.choices:
            stats['documents_by_status'][status] = Document.objects.filter(status=status).count()
        
        # Count by category
        from apps.categories.models import DocumentCategory
        for category in DocumentCategory.objects.all():
            stats['documents_by_category'][category.name] = Document.objects.filter(category=category).count()
    
    else:
        # Regular users see limited stats
        user_documents = Document.objects.filter(author=user)
        stats = {
            'my_documents': user_documents.count(),
            'my_documents_by_status': {},
            'recent_documents': DocumentListSerializer(
                user_documents.select_related('author', 'category').order_by('-created_at')[:5],
                many=True
            ).data
        }
        
        for status, _ in Document.DocumentStatus.choices:
            stats['my_documents_by_status'][status] = user_documents.filter(status=status).count()
    
    return Response(stats)