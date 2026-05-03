# Troubleshooting Guide: Dropdowns & Create Buttons Not Working

## ✅ Step 1: Database Has Been Seeded

I've already seeded the database with reference data. You should now have:
- ✅ 5 Departments (CSE, ECE, ME, SM, DS)
- ✅ 5 Batches (2020-2024)
- ✅ 5 Programmes (B.Tech, M.Tech, PhD, M.Des, B.Des)
- ✅ 10 Designations (Professor, Associate Professor, etc.)

## ✅ Step 2: Environment File Created

Created `.env` file with correct API URLs:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1/system-admin
VITE_API_BASE=http://127.0.0.1:8000/api/v1/system-admin
VITE_JWT_BASE=http://127.0.0.1:8000/api
```

## ✅ Step 3: Debug Logging Added

Added console.log statements to help identify issues. Check browser console (F12) for:
- "Loading reference data..."
- "Batches: [...]"
- "Programmes: [...]"
- "Departments: [...]"
- "Submitting student data: {...}"

---

## 🔍 How to Debug

### 1. **Start the Backend Server**

```bash
cd c:\Users\M.Gowthami\Downloads\Fusion_v3\backend
python manage.py runserver
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
```

### 2. **Start the Frontend Server**

```bash
cd c:\Users\M.Gowthami\Downloads\Fusion_v3\frontend
npm run dev
```

**Expected output:**
```
VITE v...  ready in ... ms
➜  Local:   http://localhost:5173/
```

### 3. **Open Browser Console (F12)**

Before testing, open browser DevTools:
- Press **F12** or **Ctrl+Shift+I**
- Go to **Console** tab
- Clear console (trash icon)

### 4. **Test the Dropdowns**

Navigate to **Add Student** page and check console:

**Expected logs:**
```
Loading reference data...
Batches: [{id: 1, name: "2020", year: 2020}, ...]
Programmes: [{id: 1, name: "B.Tech"}, ...]
Departments: [{id: 1, name: "CSE"}, ...]
```

**If you see errors:**
- ❌ `Failed to fetch` → Backend not running
- ❌ `401 Unauthorized` → Not logged in
- ❌ `404 Not Found` → Wrong API URL
- ❌ `Network Error` → CORS issue

### 5. **Test Creating a Student**

Fill the form and click "Create Student Account". Check console for:

**Expected log:**
```
Submitting student data: {
  roll_number: "2024CS101",
  first_name: "John",
  last_name: "Doe",
  programme_id: 1,  // Must be a number!
  batch_id: 5,      // Must be a number!
  ...
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Dropdowns Are Empty

**Symptoms:**
- "Select programme" shows no options
- "Select batch" shows no options
- "Select department" shows no options

**Console shows:**
```
Failed to load reference data: TypeError: Failed to fetch
```

**Solutions:**

1. **Check if backend is running:**
   ```bash
   # Should show Django running
   curl http://localhost:8000/api/v1/system-admin/batches/
   ```

2. **Test API directly:**
   Open in browser: `http://localhost:8000/api/v1/system-admin/batches/`
   
   **Expected response:**
   ```json
   [
     {"id": 1, "name": "2020", "year": 2020, ...},
     {"id": 2, "name": "2021", "year": 2021, ...},
     ...
   ]
   ```

3. **Check CORS settings:**
   Open `backend/config/settings.py` and ensure:
   ```python
   INSTALLED_APPS = [
       ...
       'corsheaders',
       ...
   ]
   
   MIDDLEWARE = [
       'corsheaders.middleware.CorsMiddleware',  # Must be at top
       ...
   ]
   
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",
       "http://127.0.0.1:5173",
   ]
   ```

### Issue 2: "Create Student Account" Button Does Nothing

**Symptoms:**
- Click button, no response
- No success message
- No error message

**Check Console:**
- Look for red errors
- Check Network tab for failed requests

**Solutions:**

1. **Check if all required fields are filled:**
   - Roll Number ✓
   - First Name ✓
   - Last Name ✓
   - Gender ✓
   - Category ✓
   - Programme ✓ (Must select from dropdown)
   - Batch ✓ (Must select from dropdown)
   - Semester ✓
   - Father's Name ✓
   - Mother's Name ✓

2. **Check console log:**
   ```
   Submitting student data: {...}
   ```
   If you don't see this, validation is failing silently.

3. **Check Network tab:**
   - Open DevTools → Network tab
   - Click "Create Student Account"
   - Look for POST request to `/users/add-student/`
   - Check request payload and response

### Issue 3: "Invalid batch_id" or "Invalid programme_id" Error

**Symptoms:**
```
Error: Invalid batch_id. Please select a valid batch.
```

**Cause:**
- Dropdown value is string instead of integer
- Selected value doesn't exist in database

**Solution:**
Check the console log shows:
```javascript
programme_id: 1,  // ✅ Good - number
batch_id: 5,      // ✅ Good - number

// NOT:
programme_id: "1",  // ❌ Bad - string
batch_id: "5",      // ❌ Bad - string
```

### Issue 4: "This email is already registered" Error

**Symptoms:**
```
Error: This email is already registered.
```

**Solution:**
- Use a different email
- Or leave email blank (will auto-generate: `{roll_number}@iiitdmj.ac.in`)

### Issue 5: "This username is already taken" Error

**Symptoms:**
```
Error: This username is already taken.
```

**Solution:**
- Use a different roll number/username
- Each student must have unique roll number

---

## 📋 Complete Test Checklist

### Before Testing:
- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 5173
- [ ] Database seeded (`python manage.py seed_data`)
- [ ] Browser console open (F12)
- [ ] Logged in as admin user

### Test Student Creation:
1. [ ] Navigate to Add Student page
2. [ ] Console shows "Loading reference data..."
3. [ ] Console shows batches, programmes, departments loaded
4. [ ] Programme dropdown has options (B.Tech, M.Tech, etc.)
5. [ ] Batch dropdown has options (2020, 2021, etc.)
6. [ ] Department dropdown has options (CSE, ECE, etc.)
7. [ ] Fill all required fields
8. [ ] Click "Create Student Account"
9. [ ] Console shows "Submitting student data: {...}"
10. [ ] Success message appears
11. [ ] Form resets

### Test Faculty Creation:
1. [ ] Navigate to Add Faculty/Staff page
2. [ ] Console shows reference data loaded
3. [ ] Department dropdown works
4. [ ] Designation dropdown works
5. [ ] Fill all required fields
6. [ ] Select designation (required for faculty)
7. [ ] Click "Create Account"
8. [ ] Success message appears

---

## 🔧 Manual API Testing

If UI still doesn't work, test API directly:

### Get Batches:
```bash
curl http://localhost:8000/api/v1/system-admin/batches/
```

### Get Programmes:
```bash
curl http://localhost:8000/api/v1/system-admin/programmes/
```

### Get Departments:
```bash
curl http://localhost:8000/api/v1/system-admin/departments/
```

### Create Student (with token):
```bash
curl -X POST http://localhost:8000/api/v1/system-admin/users/add-student/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "username": "2024CS999",
    "first_name": "Test",
    "last_name": "Student",
    "email": "2024CS999@iiitdmj.ac.in",
    "batch_id": 5,
    "programme_id": 1,
    "category": "GEN",
    "semester": "1",
    "gender": "M",
    "father_name": "Father",
    "mother_name": "Mother"
  }'
```

---

## 📞 Still Not Working?

### Collect This Information:

1. **Console Errors:**
   - Screenshot of browser console (F12 → Console tab)

2. **Network Requests:**
   - Screenshot of Network tab showing failed requests
   - Click on failed request → Check "Response" tab

3. **Console Logs:**
   - Copy all console.log output
   - Should show "Loading reference data..." and data arrays

4. **Backend Logs:**
   - Check terminal where `python manage.py runserver` is running
   - Look for error messages

5. **Test Results:**
   - Which dropdowns work?
   - Which don't work?
   - What error message appears?
   - At what step does it fail?

### Quick Diagnostic Commands:

```bash
# Check if backend is running
curl http://localhost:8000/api/v1/system-admin/batches/

# Check database has data
cd backend
python manage.py shell -c "from system_admin.models import GlobalsBatch; print(GlobalsBatch.objects.count())"

# Check frontend can access backend
curl -v http://localhost:8000/api/v1/system-admin/departments/
```

---

## ✅ Expected Behavior

When everything works correctly:

1. **Page loads** → Console shows "Loading reference data..."
2. **Data loads** → Console shows arrays of batches, programmes, etc.
3. **Dropdowns populate** → You can select from dropdowns
4. **Fill form** → All fields filled
5. **Click button** → Console shows "Submitting student data: {...}"
6. **Success** → Green notification "Student account created for..."
7. **Form resets** → All fields cleared

---

**Last Updated:** April 6, 2026  
**Status:** Debugging mode with console logs enabled
