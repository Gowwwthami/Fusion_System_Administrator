"""
Test script to verify user credentials
Run: python test_credentials.py
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=" * 60)
print("Testing User Credentials")
print("=" * 60)

# Test credentials
test_users = [
    {"username": "admin", "password": "admin123", "description": "Default admin account"},
    {"username": "FACULTY001", "password": "faculty123", "description": "Test faculty account"},
    {"username": "STAFF001", "password": "staff123", "description": "Test staff account"},
]

for user in test_users:
    print(f"\n{'─' * 60}")
    print(f"Testing: {user['description']}")
    print(f"Username: {user['username']}")
    print(f"Password: {user['password']}")
    print(f"{'─' * 60}")
    
    response = requests.post(
        f"{BASE_URL}/api/token/",
        json={"username": user["username"], "password": user["password"]}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS!")
        print(f"   Access Token: {data['access'][:50]}...")
        print(f"   Refresh Token: {data['refresh'][:50]}...")
        
        # Test the token by making an authenticated request
        headers = {"Authorization": f"Bearer {data['access']}"}
        user_info = requests.get(f"{BASE_URL}/api/v1/system-admin/users/", headers=headers)
        print(f"   Token validation: {'✅ Valid' if user_info.status_code == 200 else '❌ Invalid'}")
    else:
        print(f"❌ FAILED!")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")

print("\n" + "=" * 60)
print("Test Complete")
print("=" * 60)

print("\n💡 Default Credentials:")
print("   Username: admin")
print("   Password: admin123")
print("\n📝 Note: Faculty and Staff accounts may have different passwords.")
print("   Check with your system administrator for correct credentials.")
