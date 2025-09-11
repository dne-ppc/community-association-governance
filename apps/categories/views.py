from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import DocumentCategory
from .serializers import (
    DocumentCategorySerializer, DocumentCategoryCreateSerializer,
    DocumentCategoryUpdateSerializer, DocumentCategoryTreeSerializer
)
from apps.accounts.models import UserRole


class DocumentCategoryListView(generics.ListCreateAPIView):
    """List and create document categories."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentCategoryCreateSerializer
        return DocumentCategorySerializer
    
    def get_queryset(self):
        """Get all categories."""
        return DocumentCategory.objects.select_related('parent').all()
    
    def perform_create(self, serializer):
        """Create a new category."""
        # Only admins and presidents can create categories
        if not self.request.user.can_manage_users():
            raise permissions.PermissionDenied("You don't have permission to create categories")
        serializer.save()


class DocumentCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a document category."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DocumentCategoryUpdateSerializer
        return DocumentCategorySerializer
    
    def get_queryset(self):
        """Get all categories."""
        return DocumentCategory.objects.select_related('parent').all()
    
    def perform_update(self, serializer):
        """Update category."""
        if not self.request.user.can_manage_users():
            raise permissions.PermissionDenied("You don't have permission to update categories")
        serializer.save()
    
    def perform_destroy(self, serializer):
        """Delete category."""
        if not self.request.user.can_manage_users():
            raise permissions.PermissionDenied("You don't have permission to delete categories")
        
        # Check if category has documents
        if self.get_object().documents.exists():
            raise permissions.PermissionDenied("Cannot delete category with existing documents")
        
        # Check if category has children
        if self.get_object().children.exists():
            raise permissions.PermissionDenied("Cannot delete category with child categories")
        
        self.get_object().delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def category_tree(request):
    """Get category tree structure."""
    # Get root categories (categories without parents)
    root_categories = DocumentCategory.objects.filter(parent=None).select_related('parent')
    
    serializer = DocumentCategoryTreeSerializer(root_categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def category_stats(request):
    """Get category statistics."""
    if not request.user.can_manage_users():
        raise permissions.PermissionDenied("You don't have permission to view category stats")
    
    stats = {
        'total_categories': DocumentCategory.objects.count(),
        'categories_by_approval_role': {},
        'categories_with_documents': DocumentCategory.objects.filter(
            documents__isnull=False
        ).distinct().count(),
        'categories_without_documents': DocumentCategory.objects.filter(
            documents__isnull=True
        ).count()
    }
    
    # Count by approval role
    for role, _ in UserRole.choices:
        stats['categories_by_approval_role'][role] = DocumentCategory.objects.filter(
            required_approval_role=role
        ).count()
    
    return Response(stats)