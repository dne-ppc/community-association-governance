from rest_framework import permissions
from apps.accounts.models import UserRole


class IsAdminOrPresident(permissions.BasePermission):
    """Permission class for Admin or President users."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in [UserRole.ADMIN, UserRole.PRESIDENT]
        )


class IsAdminOrPresidentOrBoardMember(permissions.BasePermission):
    """Permission class for Admin, President, or Board Member users."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in [
                UserRole.ADMIN, 
                UserRole.PRESIDENT, 
                UserRole.BOARD_MEMBER
            ]
        )


class CanCreateDocuments(permissions.BasePermission):
    """Permission class for users who can create documents."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.can_create_documents()
        )


class CanApproveDocuments(permissions.BasePermission):
    """Permission class for users who can approve documents."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.can_approve_documents()
        )


class CanManageUsers(permissions.BasePermission):
    """Permission class for users who can manage other users."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.can_manage_users()
        )


class CanViewAllDocuments(permissions.BasePermission):
    """Permission class for users who can view all documents."""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.can_view_all_documents()
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permission class for object-level permissions."""
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only to the owner of the object
        return obj.author == request.user


class IsDocumentOwnerOrCanApprove(permissions.BasePermission):
    """Permission class for document-specific permissions."""
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for document owner or users who can view all documents
        if request.method in permissions.SAFE_METHODS:
            return (
                obj.author == request.user or
                obj.is_public or
                request.user.can_view_all_documents()
            )
        
        # Write permissions for document owner or users who can approve
        return (
            obj.author == request.user or
            request.user.can_approve_documents()
        )


class IsApprovalRequesterOrReviewer(permissions.BasePermission):
    """Permission class for approval request permissions."""
    
    def has_object_permission(self, request, view, obj):
        # Users can view their own requests or requests they can review
        if request.method in permissions.SAFE_METHODS:
            return (
                obj.requested_by == request.user or
                obj.can_be_reviewed_by(request.user)
            )
        
        # Users can update requests they can review
        if request.method in ['PUT', 'PATCH']:
            return obj.can_be_reviewed_by(request.user)
        
        # Users can delete their own requests or admins can delete any
        if request.method == 'DELETE':
            return (
                obj.requested_by == request.user or
                request.user.role == UserRole.ADMIN
            )
        
        return False