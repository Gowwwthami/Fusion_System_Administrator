"""
Reset passwords for test users
Run: python reset_test_passwords.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User

print("=" * 60)
print("Resetting Test User Passwords")
print("=" * 60)

# Define test users and their passwords
test_passwords = {
    "admin": "admin123",
    "FACULTY001": "faculty123",
    "STAFF001": "staff123",
    "2024CS777": "student123",
    "23bcs066": "student123",
}

for username, password in test_passwords.items():
    try:
        user = User.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"✅ Reset password for: {username}")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Email: {user.email}")
        print(f"   Active: {user.is_active}")
        print()
    except User.DoesNotExist:
        print(f"⚠️  User not found: {username}")
        print()

print("=" * 60)
print("Password Reset Complete!")
print("=" * 60)
print("\n💡 You can now login with these credentials:")
print("   - Admin: admin / admin123")
print("   - Faculty: FACULTY001 / faculty123")
print("   - Staff: STAFF001 / staff123")
print("   - Student: 2024CS777 / student123")
