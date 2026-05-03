# Quick Testing Guide - System Admin Module

## Prerequisites
1. Backend server running on `http://127.0.0.1:8000`
2. Frontend server running on `http://localhost:5173` (or your configured port)
3. Admin user created and logged in
4. Database seeded with reference data (departments, batches, programmes, designations)

---

## Test 1: Create a Student Account ✅

### Steps:
1. Open frontend in browser
2. Login as admin
3. Navigate to **User Management**
4. Click **"Add User"** button
5. Select **"Student"** tab
6. Fill in the form:
   ```
   Username: test.student01
   Email: test.student01@iiitdmj.ac.in
   First Name: Test
   Last Name: Student
   Phone: 9876543210 (optional)
   Password: (leave blank for auto-generation)
   Batch: [Select any available batch]
   Programme: [Select any available programme]
   Category: UG
   ```
7. Click **"Create User"**

### Expected Result:
✅ Green notification: "User created - 'test.student01' was created successfully."
✅ User appears in the users list
✅ Status: Active, Type: Student

### Error Tests:
- Try same email → Error: "This email is already registered."
- Try same username → Error: "This username is already taken."
- Leave batch empty → Error: "Missing required fields: batch_id"

---

## Test 2: Create a Faculty Account ✅

### Steps:
1. Click **"Add User"** button
2. Select **"Faculty"** tab
3. Fill in the form:
   ```
   Username: test.faculty01
   Email: test.faculty01@iiitdmj.ac.in
   First Name: Test
   Last Name: Faculty
   Department: [Select any department]
   Designation: [Select any designation]
   ```
4. Click **"Create User"**

### Expected Result:
✅ Green notification appears
✅ Faculty appears in users list
✅ Role automatically assigned based on designation

---

## Test 3: Create a Staff Account ✅

### Steps:
1. Click **"Add User"** button
2. Select **"Staff"** tab
3. Fill in the form (similar to faculty)
4. Click **"Create User"**

### Expected Result:
✅ Staff account created successfully
✅ Appears in users list with type "staff"

---

## Test 4: View Audit Logs ✅

### Steps:
1. Navigate to **Audit Log** page
2. Check for entries showing:
   - "user_created" actions
   - Performed by: your admin username
   - Target user: the users you just created
   - Details include user_agent and timestamp_utc

### Expected Result:
✅ Audit log shows all user creation events
✅ IP address recorded
✅ Enhanced details present

---

## Test 5: Department Hierarchy ✅

### API Test (using Postman or curl):
```bash
# Get department hierarchy
curl http://127.0.0.1:8000/api/v1/system-admin/departments/hierarchy/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Assign Head of Department
curl -X POST http://127.0.0.1:8000/api/v1/system-admin/departments/assign-hod/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"department_id": "CSE", "user_id": 2}'
```

### Expected Result:
✅ Hierarchy shows all departments with HoD info
✅ HoD assignment successful
✅ Previous HoD revoked if exists

---

## Test 6: Role Assignment ✅

### Steps:
1. Go to **Roles** page
2. Select a user
3. Click **"Assign Role"**
4. Select a designation
5. Submit

### Expected Result:
✅ Role assigned successfully
✅ If exclusive role (e.g., "Mess Caretaker"), shows conflict warning
✅ Audit log entry created

---

## Test 7: User Actions (Activate/Deactivate/Archive) ✅

### Steps:
1. In Users list, click the **⋮** (dots) menu for any user
2. Try each action:
   - **Deactivate** → User status changes to "inactive"
   - **Activate** → User status changes to "active"
   - **Archive** → User status changes to "archived"

### Expected Result:
✅ Status badges update correctly
✅ Success notifications appear
✅ Actions logged in audit trail

---

## Test 8: Emergency Access ✅

### API Test:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/system-admin/emergency-access/grant/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "approver_name": "Dr. Director",
    "approver_designation": "Director",
    "justification": "System maintenance required",
    "duration_hours": 24
  }'
```

### Expected Result:
✅ Emergency access granted
✅ User gets temporary superuser status
✅ Expiration time set (24 hours)
✅ Enhanced audit logging active

---

## Test 9: Bulk CSV Import ✅

### Create test CSV file (`test_students.csv`):
```csv
username,first_name,last_name,email,batch_id,programme_id,category
bulk.student01,Bulk,Student1,bulk1@test.com,1,1,GEN
bulk.student02,Bulk,Student2,bulk2@test.com,1,1,GEN
```

### Steps:
1. In Users page, click **"Import CSV"**
2. Select your CSV file
3. Ensure "Students" filter is selected

### Expected Result:
✅ Import complete notification
✅ Shows count: "2 created, 0 failed"
✅ Users appear in list

---

## Test 10: Export Users ✅

### Steps:
1. In Users page, click **"Export CSV"**
2. Check downloaded file

### Expected Result:
✅ CSV file downloads
✅ Contains all user data
✅ Properly formatted

---

## Common Issues & Solutions

### Issue: "Failed to load form options"
**Solution**: 
- Ensure backend is running
- Check that departments, batches, programmes exist in database
- Run: `python manage.py seed_data`

### Issue: "Invalid batch_id" or "Invalid programme_id"
**Solution**:
- Open Django admin: `http://127.0.0.1:8000/admin/`
- Verify batches and programmes exist
- Add them if missing

### Issue: Users not appearing after creation
**Solution**:
- Refresh the page
- Check browser console for errors
- Verify API response in Network tab
- Check backend logs for errors

### Issue: JWT Token errors
**Solution**:
- Logout and login again
- Check token expiration
- Verify JWT configuration in settings.py

---

## Verification Checklist

After testing, verify:

- [ ] All user types can be created (student, faculty, staff)
- [ ] Duplicate emails are rejected
- [ ] Duplicate usernames are rejected
- [ ] Required field validation works
- [ ] Error messages are clear and helpful
- [ ] Audit logs capture all actions
- [ ] Email notifications sent (check email backend)
- [ ] Department hierarchy viewable
- [ ] HoD assignment works
- [ ] Role assignment with conflict detection works
- [ ] Emergency access can be granted/revoked
- [ ] User archival works
- [ ] Bulk import/export functional
- [ ] No partial records on failed creations (rollback works)

---

## API Testing with curl

### Get Auth Token:
```bash
curl -X POST http://127.0.0.1:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'
```

### List Users:
```bash
curl http://127.0.0.1:8000/api/v1/system-admin/users/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Stats:
```bash
curl http://127.0.0.1:8000/api/v1/system-admin/stats/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Audit Logs:
```bash
curl "http://127.0.0.1:8000/api/v1/system-admin/audit-logs/?action=user_created" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Performance Notes

- Pagination: 20 users per page (configurable)
- Max page size: 100 users
- All queries optimized with select_related/prefetch_related
- No N+1 query issues

---

**Happy Testing! 🚀**
