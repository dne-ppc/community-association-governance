"""
ASGI config for community_dms project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'community_dms.settings')

application = get_asgi_application()