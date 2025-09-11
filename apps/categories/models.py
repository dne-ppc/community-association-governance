from django.db import models
from apps.accounts.models import User, UserRole


class DocumentCategory(models.Model):
    """Document category model with hierarchical structure."""
    
    name = models.CharField(max_length=200)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    description = models.TextField(blank=True, null=True)
    required_approval_role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PRESIDENT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'document_categories'
        verbose_name = 'Document Category'
        verbose_name_plural = 'Document Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @property
    def full_path(self):
        """Get the full hierarchical path of the category."""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
    
    def get_ancestors(self):
        """Get all ancestor categories."""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors
    
    def get_descendants(self):
        """Get all descendant categories."""
        descendants = []
        for child in self.children.all():
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants
    
    def get_document_count(self):
        """Get the number of documents in this category and its descendants."""
        count = self.documents.count()
        for child in self.children.all():
            count += child.get_document_count()
        return count