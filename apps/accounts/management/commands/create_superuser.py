from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser with admin role'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email address')
        parser.add_argument('--password', type=str, help='Password')
        parser.add_argument('--first-name', type=str, help='First name')
        parser.add_argument('--last-name', type=str, help='Last name')

    def handle(self, *args, **options):
        email = options.get('email') or 'admin@community-association.com'
        password = options.get('password') or 'admin123'
        first_name = options.get('first_name') or 'Admin'
        last_name = options.get('last_name') or 'User'

        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'User with email {email} already exists')
            )
            return

        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.ADMIN
        )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created superuser: {email}')
        )