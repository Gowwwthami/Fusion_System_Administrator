# Quick Test Instructions

## ✅ Backend is Running
Server: http://127.0.0.1:8000/

## 🧪 Test API Endpoints

Open these URLs in your browser to verify they work:

1. **Departments:** http://localhost:8000/api/v1/system-admin/departments/
   - Should return: Array of 5 departments

2. **Batches:** http://localhost:8000/api/v1/system-admin/batches/
   - Should return: Array of 5 batches (2020-2024)

3. **Programmes:** http://localhost:8000/api/v1/system-admin/programmes/
   - Should return: Array of 5 programmes

4. **Designations:** http://localhost:8000/api/v1/system-admin/designations/
   - Should return: Array of 10 designations

## 🚀 Start Frontend

```bash
cd c:\Users\M.Gowthami\Downloads\Fusion_v3\frontend
npm run dev
```

Then open: http://localhost:5173/

## 📝 Test Steps

1. **Login** as admin/admin123
2. **Open Browser Console** (F12)
3. **Navigate** to Add Student page
4. **Check Console** - you should see:
   ```
   Loading reference data...
   Batches: [Array of 5 objects]
   Programmes: [Array of 5 objects]
   Departments: [Array of 5 objects]
   ```

5. **Check Dropdowns** - they should now show options
6. **Fill form** and click "Create Student Account"
7. **Check Console** - you should see:
   ```
   Submitting student data: {all the form data}
   ```

## ❌ If Dropdowns Still Don't Work

Check browser console for errors. Common errors:

- **"Failed to fetch"** → CORS issue or backend not running
- **"401 Unauthorized"** → Not logged in
- **"404 Not Found"** → Wrong API URL in .env file
- **Empty arrays []** → Database not seeded

## 🔧 Quick Fix Commands

```bash
# Re-seed database
cd backend
python manage.py seed_data

# Verify data exists
python manage.py shell -c "from system_admin.models import GlobalsBatch; print('Batches:', GlobalsBatch.objects.count())"

# Test API
curl http://localhost:8000/api/v1/system-admin/batches/
```

## 📸 What to Share If Still Not Working

1. Screenshot of browser console (F12 → Console tab)
2. Screenshot of Network tab showing any failed requests
3. Tell me which dropdowns work and which don't
4. Any error messages you see
