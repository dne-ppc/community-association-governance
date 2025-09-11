from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django.utils import timezone
from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoginSerializer, RegisterSerializer
)
from .authentication import generate_jwt_token


class LoginView(APIView):
    """Login view for user authentication."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Update last login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            # Generate JWT token
            token = generate_jwt_token(user)
            
            return Response({
                'message': 'Login successful',
                'token': token,
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(APIView):
    """Registration view for new users."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT token
            token = generate_jwt_token(user)
            
            return Response({
                'message': 'Registration successful',
                'token': token,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Logout view."""
    
    def post(self, request):
        logout(request)
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """User profile view."""
    
    def get(self, request):
        """Get current user profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        """Update current user profile."""
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change password view."""
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Password changed successfully'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListCreateAPIView):
    """List and create users (admin only)."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Only admins and presidents can manage users."""
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Create a new user."""
        if not self.request.user.can_manage_users():
            raise permissions.PermissionDenied("You don't have permission to create users")
        serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a user."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Check permissions based on action."""
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        elif self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]
    
    def perform_update(self, serializer):
        """Update user."""
        if not self.request.user.can_manage_users():
            raise permissions.PermissionDenied("You don't have permission to update users")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete user."""
        if not self.request.user.can_manage_users():
            raise permissions.PermissionDenied("You don't have permission to delete users")
        instance.delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_stats(request):
    """Get user statistics."""
    if not request.user.can_manage_users():
        raise permissions.PermissionDenied("You don't have permission to view user stats")
    
    stats = {
        'total_users': User.objects.count(),
        'active_users': User.objects.filter(active=True).count(),
        'users_by_role': {}
    }
    
    for role, _ in User.UserRole.choices:
        stats['users_by_role'][role] = User.objects.filter(role=role).count()
    
    return Response(stats)