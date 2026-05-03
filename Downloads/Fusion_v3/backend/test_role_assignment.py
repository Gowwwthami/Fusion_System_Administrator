"""
Test script to assign a role to a user
Run: python test_role_assignment.py
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Step 1: Get auth token
print("=" * 60)
print("Step 1: Getting auth token...")
print("=" * 60)

login_response = requests.post(
    f"{BASE_URL}/api/token/",
    json={"username": "admin", "password": "admin123"}
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Response: {login_response.text}")
    exit(1)

token = login_response.json()["access"]
print(f"✅ Token obtained: {token[:20]}...")

# Step 2: Check designations
print("\n" + "=" * 60)
print("Step 2: Checking available designations...")
print("=" * 60)

headers = {"Authorization": f"Bearer {token}"}

desigs_resp = requests.get(f"{BASE_URL}/api/v1/system-admin/designations/", headers=headers)
print(f"Designations: {desigs_resp.status_code}")
if desigs_resp.status_code == 200:
    designations = desigs_resp.json()
    print(f"  Found {len(designations)} designations")
    for d in designations:
        print(f"  - ID: {d['id']}, Name: {d['name']}")

# Step 3: Get users
print("\n" + "=" * 60)
print("Step 3: Getting users...")
print("=" * 60)

users_resp = requests.get(f"{BASE_URL}/api/v1/system-admin/users/", headers=headers)
print(f"Users: {users_resp.status_code}")
if users_resp.status_code == 200:
    users = users_resp.json()
    user_list = users.get('results', [])
    print(f"  Found {len(user_list)} users")
    for u in user_list[:5]:
        print(f"  - Username: {u['user']['username']}, Name: {u['user']['first_name']} {u['user']['last_name']}, Type: {u['user_type']}")

# Step 4: Assign role
print("\n" + "=" * 60)
print("Step 4: Assigning role...")
print("=" * 60)

# Find a faculty user and Finance Admin designation
faculty_user = None
for u in user_list:
    if u['user_type'] == 'faculty':
        faculty_user = u['user']['username']
        break

finance_admin_desig = None
for d in designations:
    if d['name'] == 'Finance Admin':
        finance_admin_desig = d['id']
        break

if not faculty_user:
    print("❌ No faculty user found")
    exit(1)

if not finance_admin_desig:
    print("❌ Finance Admin designation not found")
    exit(1)

print(f"\nAssigning Finance Admin role to {faculty_user}...")

from datetime import date, timedelta
start_date = date.today().isoformat()
end_date = (date.today() + timedelta(days=90)).isoformat()

assign_data = {
    "username": faculty_user,
    "designation_id": finance_admin_desig,
    "start_date": start_date,
    "end_date": end_date,
    "force": False
}

print(f"\nSending data:")
print(json.dumps(assign_data, indent=2))

assign_resp = requests.post(
    f"{BASE_URL}/api/v1/system-admin/roles/assign/",
    headers={**headers, "Content-Type": "application/json"},
    json=assign_data
)

print(f"\nResponse Status: {assign_resp.status_code}")
print(f"Response Body:")
print(json.dumps(assign_resp.json(), indent=2))

if assign_resp.status_code == 201:
    print("\n✅ Role assigned successfully!")
else:
    print(f"\n❌ Failed to assign role")

# Step 5: Test module access
print("\n" + "=" * 60)
print("Step 5: Testing module access for Finance Admin...")
print("=" * 60)

module_resp = requests.get(
    f"{BASE_URL}/api/v1/system-admin/roles/module-access/?role=Finance Admin",
    headers=headers
)

print(f"Module Access: {module_resp.status_code}")
if module_resp.status_code == 200:
    modules = module_resp.json()
    print(f"  Found {len(modules)} module permissions")
    for m in modules:
        print(f"  - {m['module']}: View={m['view']}, Create={m['create']}, Edit={m['edit']}, Delete={m['delete']}")
