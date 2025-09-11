from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with initial users'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding users...')
        
        # Create admin user
        if not User.objects.filter(email='admin@community-association.com').exists():
            admin = User.objects.create_user(
                email='admin@community-association.com',
                password='admin123',
                first_name='System',
                last_name='Administrator',
                role=UserRole.ADMIN,
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(self.style.SUCCESS(f'Created admin user: {admin.email}'))
        
        # Create president user
        if not User.objects.filter(email='president@community-association.com').exists():
            president = User.objects.create_user(
                email='president@community-association.com',
                password='president123',
                first_name='Community',
                last_name='President',
                role=UserRole.PRESIDENT
            )
            self.stdout.write(self.style.SUCCESS(f'Created president user: {president.email}'))
        
        # Create board member
        if not User.objects.filter(email='board@community-association.com').exists():
            board = User.objects.create_user(
                email='board@community-association.com',
                password='board123',
                first_name='Board',
                last_name='Member',
                role=UserRole.BOARD_MEMBER
            )
            self.stdout.write(self.style.SUCCESS(f'Created board member: {board.email}'))
        
        # Create committee member
        if not User.objects.filter(email='committee@community-association.com').exists():
            committee = User.objects.create_user(
                email='committee@community-association.com',
                password='committee123',
                first_name='Committee',
                last_name='Member',
                role=UserRole.COMMITTEE_MEMBER
            )
            self.stdout.write(self.style.SUCCESS(f'Created committee member: {committee.email}'))
        
        # Create volunteer
        if not User.objects.filter(email='volunteer@community-association.com').exists():
            volunteer = User.objects.create_user(
                email='volunteer@community-association.com',
                password='volunteer123',
                first_name='Community',
                last_name='Volunteer',
                role=UserRole.VOLUNTEER
            )
            self.stdout.write(self.style.SUCCESS(f'Created volunteer: {volunteer.email}'))
        
        # Create public user
        if not User.objects.filter(email='public@community-association.com').exists():
            public = User.objects.create_user(
                email='public@community-association.com',
                password='public123',
                first_name='Public',
                last_name='User',
                role=UserRole.PUBLIC
            )
            self.stdout.write(self.style.SUCCESS(f'Created public user: {public.email}'))
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded users'))