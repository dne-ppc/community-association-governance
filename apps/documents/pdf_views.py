from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .models import Document
from .pdf_generator import PDFGenerator, generate_pdf_response
from apps.core.utils import can_user_access_document


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_pdf(request, document_id):
    """Generate PDF for a document."""
    document = get_object_or_404(Document, id=document_id)
    
    # Check if user can access this document
    if not can_user_access_document(request.user, document):
        return Response(
            {'error': 'You do not have permission to access this document'},
            status=403
        )
    
    try:
        generator = PDFGenerator()
        pdf_content = generator.generate_simple_pdf(document)
        
        filename = f"{document.slug}.pdf"
        return generate_pdf_response(pdf_content, filename)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to generate PDF: {str(e)}'},
            status=500
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_fillable_pdf(request, document_id):
    """Generate fillable PDF for a document."""
    document = get_object_or_404(Document, id=document_id)
    
    # Check if user can access this document
    if not can_user_access_document(request.user, document):
        return Response(
            {'error': 'You do not have permission to access this document'},
            status=403
        )
    
    if not document.has_fillable_fields:
        return Response(
            {'error': 'This document does not have fillable fields'},
            status=400
        )
    
    try:
        generator = PDFGenerator()
        pdf_content = generator.generate_fillable_pdf(document)
        
        filename = f"{document.slug}_fillable.pdf"
        return generate_pdf_response(pdf_content, filename)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to generate fillable PDF: {str(e)}'},
            status=500
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def preview_pdf_html(request, document_id):
    """Preview PDF as HTML."""
    document = get_object_or_404(Document, id=document_id)
    
    # Check if user can access this document
    if not can_user_access_document(request.user, document):
        return Response(
            {'error': 'You do not have permission to access this document'},
            status=403
        )
    
    try:
        generator = PDFGenerator()
        html_content = generator.generate_html_pdf(document)
        
        return HttpResponse(html_content, content_type='text/html')
    
    except Exception as e:
        return Response(
            {'error': f'Failed to generate HTML preview: {str(e)}'},
            status=500
        )