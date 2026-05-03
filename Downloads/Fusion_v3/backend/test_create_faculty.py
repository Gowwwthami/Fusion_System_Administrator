"""
Test script to create a faculty via API
Run: python test_create_faculty.py
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

# Get departments
dept_resp = requests.get(f"{BASE_URL}/api/v1/system-admin/departments/", headers=headers)
print(f"Departments: {dept_resp.status_code}")
if dept_resp.status_code == 200:
    departments = dept_resp.json()
    print(f"  Found {len(departments)} departments")
    for d in departments:
        print(f"  - ID: {d['id']}, Name: {d['name']}")

# Get designations
desig_resp = requests.get(f"{BASE_URL}/api/v1/system-admin/designations/", headers=headers)
print(f"\nDesignations: {desig_resp.status_code}")
if desig_resp.status_code == 200:
    designations = desig_resp.json()
    print(f"  Found {len(designations)} designations")
    for des in designations:
        print(f"  - ID: {des['id']}, Name: {des['name']}")

# Step 3: Create faculty
print("\n" + "=" * 60)
print("Step 3: Creating faculty...")
print("=" * 60)

faculty_data = {
    "username": "FACULTY001",
    "first_name": "Dr. John",
    "last_name": "Professor",
    "email": "john.professor@iiitdmj.ac.in",
    "department_id": "CSE",
    "designation_id": 1,  # Professor
    "gender": "M",
    "phone_no": ""  # Test with empty phone
}

print(f"\nSending data:")
print(json.dumps(faculty_data, indent=2))

create_resp = requests.post(
    f"{BASE_URL}/api/v1/system-admin/users/add-faculty/",
    headers={**headers, "Content-Type": "application/json"},
    json=faculty_data
)

print(f"\nResponse Status: {create_resp.status_code}")
print(f"Response Body:")
print(json.dumps(create_resp.json(), indent=2))

if create_resp.status_code == 201:
    print("\n✅ Faculty created successfully!")
else:
    print(f"\n❌ Failed to create faculty")

# Step 4: Create staff
print("\n" + "=" * 60)
print("Step 4: Creating staff...")
print("=" * 60)

staff_data = {
    "username": "STAFF001",
    "first_name": "Jane",
    "last_name": "Staff",
    "email": "jane.staff@iiitdmj.ac.in",
    "department_id": "CSE",
    "designation_id": 9,  # Administrative Staff
    "gender": "F",
    "phone_no": ""  # Test with empty phone
}

print(f"\nSending data:")
print(json.dumps(staff_data, indent=2))

create_resp2 = requests.post(
    f"{BASE_URL}/api/v1/system-admin/users/add-staff/",
    headers={**headers, "Content-Type": "application/json"},
    json=staff_data
)

print(f"\nResponse Status: {create_resp2.status_code}")
print(f"Response Body:")
print(json.dumps(create_resp2.json(), indent=2))

if create_resp2.status_code == 201:
    print("\n✅ Staff created successfully!")
else:
    print(f"\n❌ Failed to create staff")
