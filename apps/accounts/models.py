from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    PRESIDENT = 'PRESIDENT', 'President'
    BOARD_MEMBER = 'BOARD_MEMBER', 'Board Member'
    COMMITTEE_MEMBER = 'COMMITTEE_MEMBER', 'Committee Member'
    VOLUNTEER = 'VOLUNTEER', 'Volunteer'
    PUBLIC = 'PUBLIC', 'Public'


class User(AbstractUser):
    """Custom User model with role-based access control."""
    
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VOLUNTEER
    )
    active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Override username to use email
    username = None
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def has_role(self, role):
        """Check if user has a specific role."""
        return self.role == role
    
    def has_any_role(self, roles):
        """Check if user has any of the specified roles."""
        return self.role in roles
    
    def can_approve_documents(self):
        """Check if user can approve documents."""
        return self.role in [UserRole.ADMIN, UserRole.PRESIDENT, UserRole.BOARD_MEMBER]
    
    def can_manage_users(self):
        """Check if user can manage other users."""
        return self.role in [UserRole.ADMIN, UserRole.PRESIDENT]
    
    def can_create_documents(self):
        """Check if user can create documents."""
        return self.role in [
            UserRole.ADMIN, 
            UserRole.PRESIDENT, 
            UserRole.BOARD_MEMBER, 
            UserRole.COMMITTEE_MEMBER,
            UserRole.VOLUNTEER
        ]
    
    def can_view_all_documents(self):
        """Check if user can view all documents."""
        return self.role in [
            UserRole.ADMIN, 
            UserRole.PRESIDENT, 
            UserRole.BOARD_MEMBER
        ]