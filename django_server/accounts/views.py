from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, ActivityLog
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    ChangePasswordSerializer, ActivityLogSerializer
)


class IsOwnerOrAdmin(permissions.BasePermission):
    """Custom permission to only allow owners or admins to edit/view"""
    
    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.role == 'ADMIN':
            return True
        # Owner can view and edit their own profile
        return obj == request.user


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Log activity
        ActivityLog.objects.create(
            user=user,
            action='USER_REGISTERED',
            entity_type='User',
            entity_id=str(user.id),
            ip_address=self.get_client_ip(request)
        )
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LoginView(APIView):
    """User login endpoint"""
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Update last login
        user.update_last_login()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Log activity
        ActivityLog.objects.create(
            user=user,
            action='USER_LOGIN',
            entity_type='User',
            entity_id=str(user.id),
            ip_address=self.get_client_ip(request)
        )
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ProfileView(generics.RetrieveUpdateAPIView):
    """User profile view and update"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action='PROFILE_UPDATED',
            entity_type='User',
            entity_id=str(instance.id),
            details={'updated_fields': list(request.data.keys())}
        )
        
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """Change password endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    
    def post(self, request):
        serializer = self.serializer_class(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Log activity
        ActivityLog.objects.create(
            user=user,
            action='PASSWORD_CHANGED',
            entity_type='User',
            entity_id=str(user.id)
        )
        
        return Response({
            'message': 'Password changed successfully'
        })


class UserListView(generics.ListAPIView):
    """List all users (admin only)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by role if specified
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by active status
        is_active = self.request.query_params.get('active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Non-admins can only see active users
        if self.request.user.role != 'ADMIN':
            queryset = queryset.filter(is_active=True)
        
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """User detail view (admin only for others)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Don't allow users to delete themselves
        if instance == request.user:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete - just deactivate
        instance.is_active = False
        instance.save()
        
        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action='USER_DEACTIVATED',
            entity_type='User',
            entity_id=str(instance.id),
            details={'deactivated_user': instance.email}
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActivityLogView(generics.ListAPIView):
    """View activity logs"""
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ActivityLog.objects.all()
        
        # Non-admins can only see their own activities
        if self.request.user.role != 'ADMIN':
            queryset = queryset.filter(user=self.request.user)
        
        # Filter by user if specified
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by entity type
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        # Filter by entity id
        entity_id = self.request.query_params.get('entity_id')
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        return queryset