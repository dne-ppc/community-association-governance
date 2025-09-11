import logging
import time
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(MiddlewareMixin):
    """Middleware to log all requests."""
    
    def process_request(self, request):
        request.start_time = time.time()
    
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            logger.info(
                f"{request.method} {request.path} - "
                f"Status: {response.status_code} - "
                f"Duration: {duration:.3f}s - "
                f"IP: {self.get_client_ip(request)}"
            )
        
        return response
    
    def get_client_ip(self, request):
        """Get the client IP address from the request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip