import os
import tempfile
from io import BytesIO
from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration


class PDFGenerator:
    """PDF generation utility class."""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=6,
            alignment=TA_LEFT
        ))
    
    def generate_simple_pdf(self, document, output_filename=None):
        """Generate a simple PDF using ReportLab."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Title
        title = Paragraph(document.title, self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Document metadata
        metadata_data = [
            ['Category:', document.category.name],
            ['Author:', document.author.full_name],
            ['Created:', document.created_at.strftime('%Y-%m-%d %H:%M')],
            ['Status:', document.status],
        ]
        
        if document.approved_by:
            metadata_data.append(['Approved by:', document.approved_by.full_name])
            metadata_data.append(['Approved at:', document.approved_at.strftime('%Y-%m-%d %H:%M')])
        
        metadata_table = Table(metadata_data, colWidths=[1.5*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(metadata_table)
        story.append(Spacer(1, 20))
        
        # Convert markdown to HTML then to plain text for ReportLab
        html_content = markdown.markdown(document.content_markdown)
        # Simple HTML to text conversion (you might want to use a proper HTML parser)
        text_content = self.html_to_text(html_content)
        
        # Split content into paragraphs
        paragraphs = text_content.split('\n\n')
        
        for para in paragraphs:
            if para.strip():
                p = Paragraph(para.strip(), self.styles['CustomBody'])
                story.append(p)
                story.append(Spacer(1, 6))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content
    
    def generate_html_pdf(self, document, output_filename=None):
        """Generate PDF using WeasyPrint (better HTML/CSS support)."""
        # Render HTML template
        html_content = render_to_string('documents/pdf_template.html', {
            'document': document,
            'content_html': markdown.markdown(document.content_markdown)
        })
        
        # Generate PDF
        font_config = FontConfiguration()
        pdf_content = HTML(string=html_content).write_pdf(
            stylesheets=[CSS(string=self.get_pdf_css())],
            font_config=font_config
        )
        
        return pdf_content
    
    def generate_fillable_pdf(self, document, output_filename=None):
        """Generate a fillable PDF with form fields."""
        # This would require additional libraries like PyPDF2 or similar
        # For now, we'll generate a regular PDF with form field placeholders
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Title
        title = Paragraph(document.title, self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Document metadata
        metadata_data = [
            ['Category:', document.category.name],
            ['Author:', document.author.full_name],
            ['Created:', document.created_at.strftime('%Y-%m-%d %H:%M')],
            ['Status:', document.status],
        ]
        
        metadata_table = Table(metadata_data, colWidths=[1.5*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(metadata_table)
        story.append(Spacer(1, 20))
        
        # Add form fields if document has them
        if document.has_fillable_fields and document.form_fields.exists():
            story.append(Paragraph("Form Fields:", self.styles['CustomHeading']))
            story.append(Spacer(1, 6))
            
            for field in document.form_fields.all():
                field_text = f"{field.field_name}: _________________"
                if field.required:
                    field_text += " (Required)"
                p = Paragraph(field_text, self.styles['CustomBody'])
                story.append(p)
                story.append(Spacer(1, 6))
            
            story.append(Spacer(1, 12))
        
        # Convert markdown to text
        html_content = markdown.markdown(document.content_markdown)
        text_content = self.html_to_text(html_content)
        
        # Split content into paragraphs
        paragraphs = text_content.split('\n\n')
        
        for para in paragraphs:
            if para.strip():
                p = Paragraph(para.strip(), self.styles['CustomBody'])
                story.append(p)
                story.append(Spacer(1, 6))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content
    
    def html_to_text(self, html_content):
        """Simple HTML to text conversion."""
        import re
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', html_content)
        
        # Decode HTML entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        
        return text
    
    def get_pdf_css(self):
        """Get CSS styles for PDF generation."""
        return """
        @page {
            size: A4;
            margin: 1in;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
        }
        
        h1 {
            color: #2c3e50;
            font-size: 18pt;
            margin-bottom: 20pt;
            text-align: center;
        }
        
        h2 {
            color: #34495e;
            font-size: 14pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
        }
        
        h3 {
            color: #34495e;
            font-size: 12pt;
            margin-top: 12pt;
            margin-bottom: 6pt;
        }
        
        p {
            margin-bottom: 6pt;
        }
        
        .metadata {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10pt;
            margin-bottom: 20pt;
        }
        
        .metadata table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .metadata td {
            padding: 4pt;
            border-bottom: 1px solid #dee2e6;
        }
        
        .metadata td:first-child {
            font-weight: bold;
            background-color: #e9ecef;
            width: 30%;
        }
        
        .form-field {
            margin-bottom: 8pt;
            padding: 4pt;
            border-bottom: 1px dotted #ccc;
        }
        
        .required {
            color: #dc3545;
        }
        """


def generate_pdf_response(pdf_content, filename):
    """Generate HTTP response with PDF content."""
    response = HttpResponse(pdf_content, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response