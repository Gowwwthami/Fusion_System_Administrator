"""
Test script to create a student via API
Run: python test_create_student.py
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

# Step 2: Check reference data
print("\n" + "=" * 60)
print("Step 2: Checking reference data...")
print("=" * 60)

headers = {"Authorization": f"Bearer {token}"}

# Get batches
batches_resp = requests.get(f"{BASE_URL}/api/v1/system-admin/batches/", headers=headers)
print(f"Batches: {batches_resp.status_code}")
if batches_resp.status_code == 200:
    batches = batches_resp.json()
    print(f"  Found {len(batches)} batches")
    for b in batches[:3]:
        print(f"  - ID: {b['id']}, Name: {b['name']}, Year: {b['year']}")

# Get programmes
prog_resp = requests.get(f"{BASE_URL}/api/v1/system-admin/programmes/", headers=headers)
print(f"\nProgrammes: {prog_resp.status_code}")
if prog_resp.status_code == 200:
    programmes = prog_resp.json()
    print(f"  Found {len(programmes)} programmes")
    for p in programmes[:3]:
        print(f"  - ID: {p['id']}, Name: {p['name']}")

# Get departments
dept_resp = requests.get(f"{BASE_URL}/api/v1/system-admin/departments/", headers=headers)
print(f"\nDepartments: {dept_resp.status_code}")
if dept_resp.status_code == 200:
    departments = dept_resp.json()
    print(f"  Found {len(departments)} departments")
    for d in departments:
        print(f"  - ID: {d['id']}, Name: {d['name']}")

# Step 3: Create student
print("\n" + "=" * 60)
print("Step 3: Creating student...")
print("=" * 60)

student_data = {
    "username": "2024CS777",
    "first_name": "Test",
    "last_name": "Student",
    "email": "2024cs777@iiitdmj.ac.in",
    "batch_id": 5,
    "programme_id": 1,
    "category": "GEN",
    "semester": "1",
    "gender": "M",
    "father_name": "Test Father",
    "mother_name": "Test Mother",
    "phone_no": "",
    "title": ""
}

print(f"\nSending data:")
print(json.dumps(student_data, indent=2))

create_resp = requests.post(
    f"{BASE_URL}/api/v1/system-admin/users/add-student/",
    headers={**headers, "Content-Type": "application/json"},
    json=student_data
)

print(f"\nResponse Status: {create_resp.status_code}")
print(f"Response Body:")
print(json.dumps(create_resp.json(), indent=2))

if create_resp.status_code == 201:
    print("\n✅ Student created successfully!")
else:
    print(f"\n❌ Failed to create student")
