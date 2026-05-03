#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User

# Delete existing admin if exists
User.objects.filter(username='admin').delete()

# Create new superuser
user = User.objects.create_superuser(
    username='admin',
    email='mgowthami2955@gmail.com',
    password='admin123'
)
print(f"Superuser 'admin' created successfully!")
print(f"Email: mgowthami2955@gmail.com")
print(f"Password: admin123")
