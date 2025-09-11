import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    """JWT Authentication class for Django REST Framework."""
    
    def authenticate(self, request):
        """Authenticate the request using JWT token."""
        token = self.get_token_from_request(request)
        
        if not token:
            return None
        
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
        
        user_id = payload.get('user_id')
        if not user_id:
            raise exceptions.AuthenticationFailed('Token does not contain user_id')
        
        try:
            user = User.objects.get(id=user_id, active=True)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found')
        
        return (user, token)
    
    def get_token_from_request(self, request):
        """Extract JWT token from request headers."""
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
        
        try:
            prefix, token = auth_header.split(' ')
            if prefix.lower() != 'bearer':
                return None
            return token
        except ValueError:
            return None


def generate_jwt_token(user):
    """Generate JWT token for a user."""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(seconds=settings.JWT_EXPIRATION_DELTA),
        'iat': datetime.utcnow(),
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token


def decode_jwt_token(token):
    """Decode JWT token and return payload."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise exceptions.AuthenticationFailed('Token has expired')
    except jwt.InvalidTokenError:
        raise exceptions.AuthenticationFailed('Invalid token')