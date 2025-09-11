"""PDF generation utilities for documents"""
import io
import markdown2
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.platypus import Table, TableStyle
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from pypdf2 import PdfReader, PdfWriter
from django.http import HttpResponse
from datetime import datetime


class PDFGenerator:
    """Generate PDFs from documents"""
    
    def __init__(self, document):
        self.document = document
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        # Heading styles
        self.styles.add(ParagraphStyle(
            name='CustomHeading1',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12,
            spaceBefore=12
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading2',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#555555'),
            spaceAfter=10,
            spaceBefore=10
        ))
        
        # Body text style
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=12
        ))
        
        # Footer style
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.grey,
            alignment=TA_CENTER
        ))
    
    def generate_static_pdf(self):
        """Generate a static PDF from the document"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Convert markdown to HTML
        html_content = markdown2.markdown(
            self.document.content_markdown,
            extras=['tables', 'fenced-code-blocks', 'header-ids']
        )
        
        # Build PDF content
        story = []
        
        # Add title
        story.append(Paragraph(self.document.title, self.styles['CustomTitle']))
        story.append(Spacer(1, 12))
        
        # Add metadata
        metadata_text = f"""
        <para>
        <b>Category:</b> {self.document.category.get_full_path()}<br/>
        <b>Author:</b> {self.document.author.full_name}<br/>
        <b>Created:</b> {self.document.created_at.strftime('%B %d, %Y')}<br/>
        <b>Status:</b> {self.document.get_status_display()}<br/>
        </para>
        """
        story.append(Paragraph(metadata_text, self.styles['Normal']))
        story.append(Spacer(1, 24))
        
        # Add content
        # Parse HTML and convert to reportlab elements
        # This is simplified - in production you'd want a proper HTML parser
        lines = html_content.split('\n')
        for line in lines:
            if line.strip():
                if line.startswith('<h1>'):
                    text = line.replace('<h1>', '').replace('</h1>', '')
                    story.append(Paragraph(text, self.styles['CustomHeading1']))
                elif line.startswith('<h2>'):
                    text = line.replace('<h2>', '').replace('</h2>', '')
                    story.append(Paragraph(text, self.styles['CustomHeading2']))
                elif line.startswith('<p>'):
                    text = line.replace('<p>', '').replace('</p>', '')
                    story.append(Paragraph(text, self.styles['CustomBody']))
                else:
                    story.append(Paragraph(line, self.styles['CustomBody']))
        
        # Add footer
        story.append(Spacer(1, 24))
        footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        story.append(Paragraph(footer_text, self.styles['Footer']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_fillable_pdf(self):
        """Generate a fillable PDF with form fields"""
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Add title
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.HexColor('#1976d2'))
        c.drawCentredString(letter[0]/2, letter[1]-100, self.document.title)
        
        # Add metadata
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.black)
        y_position = letter[1] - 150
        c.drawString(72, y_position, f"Category: {self.document.category.get_full_path()}")
        y_position -= 20
        c.drawString(72, y_position, f"Author: {self.document.author.full_name}")
        y_position -= 20
        c.drawString(72, y_position, f"Date: {self.document.created_at.strftime('%B %d, %Y')}")
        
        # Add form fields
        y_position -= 40
        form = c.acroForm
        
        for field in self.document.form_fields.all().order_by('position'):
            # Add field label
            c.setFont("Helvetica", 12)
            c.drawString(72, y_position, field.field_name + ("*" if field.required else ""))
            y_position -= 25
            
            # Add form field based on type
            if field.field_type == 'TEXT':
                form.textfield(
                    name=field.field_name,
                    tooltip=field.placeholder_text or field.field_name,
                    x=72,
                    y=y_position,
                    borderStyle='inset',
                    width=400,
                    height=20,
                    textColor=colors.black,
                    fillColor=colors.white,
                    borderColor=colors.black,
                    forceBorder=True
                )
                y_position -= 30
                
            elif field.field_type == 'TEXTAREA':
                form.textfield(
                    name=field.field_name,
                    tooltip=field.placeholder_text or field.field_name,
                    x=72,
                    y=y_position - 60,
                    borderStyle='inset',
                    width=400,
                    height=80,
                    textColor=colors.black,
                    fillColor=colors.white,
                    borderColor=colors.black,
                    forceBorder=True,
                    multiline=True
                )
                y_position -= 90
                
            elif field.field_type == 'CHECKBOX':
                form.checkbox(
                    name=field.field_name,
                    tooltip=field.placeholder_text or field.field_name,
                    x=72,
                    y=y_position,
                    size=15,
                    borderColor=colors.black,
                    fillColor=colors.white,
                    textColor=colors.black,
                    forceBorder=True
                )
                c.drawString(92, y_position, field.placeholder_text or "Check if applicable")
                y_position -= 30
                
            elif field.field_type == 'SELECT':
                options = field.get_options_list()
                if options:
                    form.choice(
                        name=field.field_name,
                        tooltip=field.placeholder_text or field.field_name,
                        value=options[0] if options else '',
                        x=72,
                        y=y_position,
                        width=400,
                        height=20,
                        options=options,
                        borderColor=colors.black,
                        fillColor=colors.white,
                        textColor=colors.black,
                        forceBorder=True
                    )
                y_position -= 30
            
            elif field.field_type == 'DATE':
                form.textfield(
                    name=field.field_name,
                    tooltip="Enter date (MM/DD/YYYY)",
                    x=72,
                    y=y_position,
                    borderStyle='inset',
                    width=120,
                    height=20,
                    textColor=colors.black,
                    fillColor=colors.white,
                    borderColor=colors.black,
                    forceBorder=True
                )
                y_position -= 30
            
            elif field.field_type == 'SIGNATURE':
                c.drawString(72, y_position, "Signature:")
                c.line(150, y_position, 400, y_position)
                y_position -= 30
            
            # Check if we need a new page
            if y_position < 100:
                c.showPage()
                y_position = letter[1] - 100
        
        # Add footer
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.grey)
        c.drawCentredString(
            letter[0]/2,
            50,
            f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        )
        
        c.save()
        buffer.seek(0)
        return buffer
    
    def generate_preview_html(self):
        """Generate HTML preview of the document"""
        html_content = markdown2.markdown(
            self.document.content_markdown,
            extras=['tables', 'fenced-code-blocks', 'header-ids', 'strike']
        )
        
        # Wrap in HTML template
        template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{self.document.title}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                h1 {{
                    color: #1976d2;
                    border-bottom: 2px solid #1976d2;
                    padding-bottom: 10px;
                }}
                h2 {{
                    color: #555;
                    margin-top: 30px;
                }}
                .metadata {{
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 30px;
                }}
                .metadata p {{
                    margin: 5px 0;
                }}
                table {{
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }}
                th {{
                    background-color: #f5f5f5;
                }}
                code {{
                    background: #f4f4f4;
                    padding: 2px 5px;
                    border-radius: 3px;
                }}
                pre {{
                    background: #f4f4f4;
                    padding: 15px;
                    border-radius: 5px;
                    overflow-x: auto;
                }}
                .form-field {{
                    margin: 20px 0;
                    padding: 15px;
                    background: #fafafa;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }}
                .form-field label {{
                    font-weight: bold;
                    display: block;
                    margin-bottom: 5px;
                }}
                .form-field input, .form-field select, .form-field textarea {{
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                }}
                .required {{
                    color: red;
                }}
            </style>
        </head>
        <body>
            <h1>{self.document.title}</h1>
            <div class="metadata">
                <p><strong>Category:</strong> {self.document.category.get_full_path()}</p>
                <p><strong>Author:</strong> {self.document.author.full_name}</p>
                <p><strong>Created:</strong> {self.document.created_at.strftime('%B %d, %Y')}</p>
                <p><strong>Status:</strong> {self.document.get_status_display()}</p>
            </div>
            {html_content}
        """
        
        # Add form fields if any
        if self.document.has_fillable_fields and self.document.form_fields.exists():
            template += '<h2>Form Fields</h2>'
            for field in self.document.form_fields.all().order_by('position'):
                required = '<span class="required">*</span>' if field.required else ''
                template += f'''
                <div class="form-field">
                    <label>{field.field_name}{required}</label>
                '''
                
                if field.field_type == 'TEXT':
                    template += f'<input type="text" placeholder="{field.placeholder_text or ""}">'
                elif field.field_type == 'EMAIL':
                    template += f'<input type="email" placeholder="{field.placeholder_text or ""}">'
                elif field.field_type == 'DATE':
                    template += '<input type="date">'
                elif field.field_type == 'TEXTAREA':
                    template += f'<textarea rows="4" placeholder="{field.placeholder_text or ""}"></textarea>'
                elif field.field_type == 'CHECKBOX':
                    template += f'<input type="checkbox"> {field.placeholder_text or "Check if applicable"}'
                elif field.field_type == 'SELECT':
                    options = field.get_options_list()
                    template += '<select>'
                    for option in options:
                        template += f'<option>{option}</option>'
                    template += '</select>'
                elif field.field_type == 'SIGNATURE':
                    template += '<div style="border-bottom: 1px solid #333; height: 40px; margin-top: 10px;"></div>'
                
                template += '</div>'
        
        template += """
        </body>
        </html>
        """
        
        return template