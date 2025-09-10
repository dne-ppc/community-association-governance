const { marked } = require('marked');
const DOMPurify = require('isomorphic-dompurify');

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
  sanitize: false, // We'll use DOMPurify for sanitization
  smartLists: true,
  smartypants: true,
  xhtml: false
});

// Custom renderer for form fields
const renderer = new marked.Renderer();

// Override link renderer to add target="_blank" for external links
renderer.link = (href, title, text) => {
  const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
  const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
};

// Custom form field syntax: {{field:type:name:label}}
// Example: {{field:text:full_name:Full Name}}
renderer.paragraph = (text) => {
  const formFieldRegex = /\{\{field:(\w+):(\w+):([^}]+)\}\}/g;
  
  const processedText = text.replace(formFieldRegex, (match, type, name, label) => {
    return `<div class="form-field" data-field-type="${type}" data-field-name="${name}" data-field-label="${label}">
      <label for="${name}">${label}</label>
      <input type="${type}" id="${name}" name="${name}" class="form-control" />
    </div>`;
  });
  
  return `<p>${processedText}</p>`;
};

// Convert markdown to HTML
const convertMarkdownToHtml = (markdown) => {
  if (!markdown) return '';
  
  try {
    // Parse markdown to HTML
    const rawHtml = marked(markdown, { renderer });
    
    // Sanitize HTML to prevent XSS
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['div', 'label', 'input'],
      ADD_ATTR: ['target', 'rel', 'data-field-type', 'data-field-name', 'data-field-label', 'type', 'name', 'id', 'class']
    });
    
    return cleanHtml;
  } catch (error) {
    console.error('Markdown conversion error:', error);
    return '';
  }
};

// Extract form fields from markdown
const extractFormFields = (markdown) => {
  const formFieldRegex = /\{\{field:(\w+):(\w+):([^}]+)\}\}/g;
  const fields = [];
  let match;
  
  while ((match = formFieldRegex.exec(markdown)) !== null) {
    fields.push({
      type: match[1],
      name: match[2],
      label: match[3]
    });
  }
  
  return fields;
};

// Convert HTML back to markdown (for editing)
const convertHtmlToMarkdown = (html) => {
  // This is a simplified implementation
  // In production, you might want to use a library like turndown
  let markdown = html;
  
  // Convert headers
  markdown = markdown.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n');
  markdown = markdown.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n');
  markdown = markdown.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n');
  
  // Convert bold and italic
  markdown = markdown.replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>([^<]+)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>([^<]+)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>([^<]+)<\/i>/gi, '*$1*');
  
  // Convert links
  markdown = markdown.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)');
  
  // Convert line breaks and paragraphs
  markdown = markdown.replace(/<br[^>]*>/gi, '\n');
  markdown = markdown.replace(/<p[^>]*>([^<]+)<\/p>/gi, '$1\n\n');
  
  // Convert lists
  markdown = markdown.replace(/<li[^>]*>([^<]+)<\/li>/gi, '- $1\n');
  markdown = markdown.replace(/<ul[^>]*>|<\/ul>/gi, '');
  markdown = markdown.replace(/<ol[^>]*>|<\/ol>/gi, '');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
};

module.exports = {
  convertMarkdownToHtml,
  extractFormFields,
  convertHtmlToMarkdown
};