from rest_framework import generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.http import HttpResponse
from .models import Document, DocumentCategory, DocumentVersion, FormField
from .serializers import (
    DocumentListSerializer, DocumentDetailSerializer,
    DocumentCreateSerializer, DocumentUpdateSerializer,
    DocumentCategorySerializer, DocumentVersionSerializer,
    FormFieldSerializer
)
from .pdf_utils import PDFGenerator
from accounts.models import ActivityLog


class DocumentPermission(permissions.BasePermission):
    """Custom permission for documents"""
    
    def has_permission(self, request, view):
        # Anyone can view
        if request.method in permissions.SAFE_METHODS:
            return True
        # Only authenticated users can create
        if request.method == 'POST':
            return request.user.is_authenticated and request.user.can_create_documents()
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check view permission
        if request.method in permissions.SAFE_METHODS:
            return obj.can_user_view(request.user if request.user.is_authenticated else None)
        # Check edit permission
        return obj.can_user_edit(request.user)


class DocumentCategoryViewSet(ModelViewSet):
    """Document category CRUD operations"""
    queryset = DocumentCategory.objects.all()
    serializer_class = DocumentCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by parent
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            if parent_id == 'null':
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)
        
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check if category has documents
        if instance.documents.exists():
            return Response(
                {'error': 'Cannot delete category with existing documents'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if category has children
        if instance.children.exists():
            return Response(
                {'error': 'Cannot delete category with subcategories'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)


class DocumentViewSet(ModelViewSet):
    """Document CRUD operations"""
    queryset = Document.objects.all()
    permission_classes = [DocumentPermission]
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DocumentListSerializer
        elif self.action == 'create':
            return DocumentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DocumentUpdateSerializer
        return DocumentDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter based on user permissions
        if not user.is_authenticated:
            queryset = queryset.filter(is_public=True, status='LIVE')
        elif user.role == 'PUBLIC':
            queryset = queryset.filter(
                Q(is_public=True, status='LIVE') |
                Q(author=user)
            )
        
        # Apply filters
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        author = self.request.query_params.get('author')
        if author:
            queryset = queryset.filter(author_id=author)
        
        is_public = self.request.query_params.get('is_public')
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() == 'true')
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(content_markdown__icontains=search) |
                Q(tags__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        document = serializer.save(author=self.request.user)
        
        # Log activity
        ActivityLog.objects.create(
            user=self.request.user,
            action='DOCUMENT_CREATED',
            entity_type='Document',
            entity_id=str(document.id),
            details={'title': document.title}
        )
    
    def perform_update(self, serializer):
        document = serializer.save()
        
        # Log activity
        ActivityLog.objects.create(
            user=self.request.user,
            action='DOCUMENT_UPDATED',
            entity_type='Document',
            entity_id=str(document.id),
            details={'title': document.title}
        )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Only allow deletion of draft documents
        if instance.status not in ['PENDING', 'ARCHIVED']:
            return Response(
                {'error': 'Can only delete draft or archived documents'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log activity before deletion
        ActivityLog.objects.create(
            user=request.user,
            action='DOCUMENT_DELETED',
            entity_type='Document',
            entity_id=str(instance.id),
            details={'title': instance.title}
        )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, slug=None):
        """Get document versions"""
        document = self.get_object()
        versions = document.versions.all()
        serializer = DocumentVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def diff(self, request, slug=None):
        """Get diff between two versions"""
        document = self.get_object()
        version1_id = request.query_params.get('v1')
        version2_id = request.query_params.get('v2')
        
        if not version1_id or not version2_id:
            return Response(
                {'error': 'Both v1 and v2 parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            v1 = document.versions.get(version_number=version1_id)
            v2 = document.versions.get(version_number=version2_id)
        except DocumentVersion.DoesNotExist:
            return Response(
                {'error': 'Version not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from diff_match_patch import diff_match_patch
        dmp = diff_match_patch()
        diffs = dmp.diff_main(v1.content_markdown, v2.content_markdown)
        diff_html = dmp.diff_prettyHtml(diffs)
        
        return Response({
            'version1': DocumentVersionSerializer(v1).data,
            'version2': DocumentVersionSerializer(v2).data,
            'diff_html': diff_html
        })
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, slug=None):
        """Duplicate a document"""
        document = self.get_object()
        
        # Create a copy
        new_document = Document.objects.create(
            title=f"{document.title} (Copy)",
            category=document.category,
            content_markdown=document.content_markdown,
            is_public=False,
            has_fillable_fields=document.has_fillable_fields,
            author=request.user,
            status='PENDING',
            tags=document.tags,
            metadata=document.metadata
        )
        
        # Copy form fields
        for field in document.form_fields.all():
            FormField.objects.create(
                document=new_document,
                field_name=field.field_name,
                field_type=field.field_type,
                position=field.position,
                required=field.required,
                placeholder_text=field.placeholder_text,
                options=field.options,
                validation_rules=field.validation_rules
            )
        
        # Create initial version
        new_document.create_version(
            author=request.user,
            change_description=f'Duplicated from {document.title}'
        )
        
        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action='DOCUMENT_DUPLICATED',
            entity_type='Document',
            entity_id=str(new_document.id),
            details={
                'original_id': str(document.id),
                'original_title': document.title,
                'new_title': new_document.title
            }
        )
        
        serializer = DocumentDetailSerializer(new_document, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, slug=None):
        """Generate static PDF of the document"""
        document = self.get_object()
        
        # Check permission
        if not document.can_user_view(request.user if request.user.is_authenticated else None):
            return Response(
                {'error': 'You do not have permission to view this document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate PDF
        pdf_generator = PDFGenerator(document)
        buffer = pdf_generator.generate_static_pdf()
        
        # Log activity
        if request.user.is_authenticated:
            ActivityLog.objects.create(
                user=request.user,
                action='PDF_GENERATED',
                entity_type='Document',
                entity_id=str(document.id),
                details={'document_title': document.title, 'type': 'static'}
            )
        
        # Return PDF response
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{document.slug}.pdf"'
        return response
    
    @action(detail=True, methods=['get'])
    def generate_fillable_pdf(self, request, slug=None):
        """Generate fillable PDF with form fields"""
        document = self.get_object()
        
        # Check permission
        if not document.can_user_view(request.user if request.user.is_authenticated else None):
            return Response(
                {'error': 'You do not have permission to view this document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if document has fillable fields
        if not document.has_fillable_fields or not document.form_fields.exists():
            return Response(
                {'error': 'This document does not have fillable fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate PDF
        pdf_generator = PDFGenerator(document)
        buffer = pdf_generator.generate_fillable_pdf()
        
        # Log activity
        if request.user.is_authenticated:
            ActivityLog.objects.create(
                user=request.user,
                action='PDF_GENERATED',
                entity_type='Document',
                entity_id=str(document.id),
                details={'document_title': document.title, 'type': 'fillable'}
            )
        
        # Return PDF response
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{document.slug}-fillable.pdf"'
        return response
    
    @action(detail=True, methods=['get'])
    def preview_html(self, request, slug=None):
        """Generate HTML preview of the document"""
        document = self.get_object()
        
        # Check permission
        if not document.can_user_view(request.user if request.user.is_authenticated else None):
            return Response(
                {'error': 'You do not have permission to view this document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate HTML
        pdf_generator = PDFGenerator(document)
        html_content = pdf_generator.generate_preview_html()
        
        # Return HTML response
        return HttpResponse(html_content, content_type='text/html')


class FormFieldViewSet(ModelViewSet):
    """Form field CRUD operations"""
    queryset = FormField.objects.all()
    serializer_class = FormFieldSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by document
        document_id = self.request.query_params.get('document')
        if document_id:
            queryset = queryset.filter(document_id=document_id)
        
        return queryset