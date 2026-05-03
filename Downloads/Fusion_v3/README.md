# FusionERP — System Admin Module

Complete System Administration module for FusionERP at IIITDM Jabalpur. This module provides comprehensive user management, role-based access control (RBAC), audit logging, and administrative tools for managing the entire ERP system.

---

## 🎯 Core Features

### 1. 👤 User Management

#### **User Creation**
- ✅ Create Student accounts with complete profile information
  - Roll number, name, email, gender, category
  - Programme, Batch, Semester selection
  - Parent names (Father & Mother)
  - Contact information (phone, email)
  - Auto-generate email if not provided
  
- ✅ Create Faculty accounts
  - Username, name, email, contact details
  - Department and designation assignment
  - Automatic role assignment
  
- ✅ Create Staff accounts
  - Username, name, email, contact details
  - Department and designation assignment
  - Automatic role assignment

#### **User Lifecycle Management**
- ✅ **Activate Users** - Enable deactivated user accounts
- ✅ **Deactivate Users** - Temporarily disable accounts
- ✅ **Archive Users** - Long-term archival with data retention (3 years default)
  - Complete data snapshot preservation
  - Configurable retention period
  - Audit trail for compliance
  
- ✅ **Password Reset** - Reset user passwords with email notification
- ✅ **Mail Batch** - Generate and email passwords to entire batch of students

#### **User Directory**
- ✅ Browse all users with pagination
- ✅ Filter by user type (Student, Faculty, Staff)
- ✅ Search users by name, username, or email
- ✅ Dedicated views for:
  - Students (filter by programme, discipline, batch, semester, category, gender)
  - Faculty (filter by department, designation, gender)
  - Staff (filter by department, gender)

#### **Bulk Operations**
- ✅ **CSV Import** - Bulk upload users from CSV files
  - Separate templates for students, faculty, and staff
  - Validation and error reporting
  - Success/failure summary
  
- ✅ **CSV Export** - Export user data to CSV
  - Filter by user type
  - Complete user information export

---

### 2. 🔐 Role-Based Access Control (RBAC)

#### **Role Assignment**
- ✅ Assign roles to users (Faculty/Staff only)
- ✅ Configure role start and end dates
- ✅ Automatic role expiry tracking
- ✅ Role status monitoring (Active, Expired, Revoked)

#### **Role Management**
- ✅ View all current role assignments
- ✅ Revoke active roles
- ✅ Reassign roles between users
- ✅ Track role history in audit logs

#### **Exclusive Role Enforcement**
- ✅ Prevent duplicate assignments for exclusive roles:
  - Mess Caretaker
  - Mess Warden
  - Hostel Admin
- ✅ Force reassignment with responsibility transfer warning
- ✅ Conflict detection and resolution

#### **Module Access Control**
- ✅ Define module-level permissions per role:
  - **Mess Admin**: Mess Menu, Mess Billing, Feedback
  - **Mess Caretaker**: Mess Menu, Mess Billing, Feedback
  - **Mess Warden**: Mess Menu, Mess Billing, Feedback, Warden Reports
  - **Library Admin**: Library Catalog, Member Management, Circulation
  - **Academic Admin**: Academic Records, Timetable, Exam Schedule
  - **Hostel Admin**: Hostel Allotment, Hostel Complaints
  - **Finance Admin**: Fee Management, Payroll, Accounts
  - **Placement Admin**: Placement Records, Company Management
  
- ✅ Permission types per module:
  - View access
  - Create access
  - Edit access
  - Delete access

#### **Available Designations**
- **Academic**: Professor, Associate Professor, Assistant Professor, HOD, Dean, Director
- **Administrative**: Registrar, Technical Staff, Administrative Staff, Lab Assistant
- **Functional**: Mess Admin, Mess Caretaker, Mess Warden, Library Admin, Academic Admin, Hostel Admin, Finance Admin, Placement Admin

---

### 3. 📊 Audit & Compliance

#### **Audit Logging**
- ✅ Track all administrative actions:
  - User creation (student, faculty, staff)
  - User status changes (activate, deactivate, archive)
  - Password resets
  - Role assignments, reassignments, revocations
  - Bulk imports
  - Emergency access grants
  
- ✅ Detailed audit information:
  - Action type and timestamp
  - Performed by (admin user)
  - Target user
  - Action details and metadata
  - IP address tracking
  - User agent tracking
  - UTC timestamp for compliance

#### **Audit Log Features**
- ✅ Filter by action type
- ✅ Filter by performed by (admin)
- ✅ Filter by target user
- ✅ Filter by date range
- ✅ Paginated results
- ✅ Export to CSV

---

### 4. 🏢 Department & Organization Management

#### **Department Hierarchy**
- ✅ View department structure
- ✅ Assign Head of Department (HoD)
- ✅ Track department-wise user count
- ✅ View current HoD for each department
- ✅ Automatic department transfer when assigning HoD

#### **Reference Data Management**
- ✅ Departments (CSE, ECE, ME, Smart Manufacturing, Design)
- ✅ Batches (year-based with discipline tracking)
- ✅ Programmes (B.Tech, M.Tech, PhD, M.Des, B.Des)
- ✅ Designations (18 total roles)

---

### 5. 🚨 Emergency Access Management

#### **Emergency Access Grant**
- ✅ Grant temporary superuser access
- ✅ Configurable duration (default: 24 hours)
- ✅ Requires approver information:
  - Approver name
  - Approver designation
  - Justification for emergency access
  
- ✅ Automatic expiry tracking
- ✅ IP address logging
- ✅ Audit trail for compliance

#### **Emergency Access Control**
- ✅ Revoke emergency access before expiry
- ✅ View all emergency access grants
- ✅ Track active/expired access
- ✅ Automatic superuser status removal on expiry/revocation

---

### 6. 🔄 Role Switching

#### **User Role Session Management**
- ✅ Users with multiple roles can switch active role
- ✅ Track active role session
- ✅ Session data logging
- ✅ Module access changes based on active role

---

### 7. 📈 Dashboard & Statistics

#### **User Statistics**
- ✅ Total user count
- ✅ Active users count
- ✅ Inactive users count
- ✅ Archived users count
- ✅ Breakdown by user type:
  - Students
  - Faculty
  - Staff

---

### 8. 🔒 Business Rules Enforcement

#### **Implemented Business Rules**
- ✅ **BR-SA-001**: Only Faculty/Staff can be Super Admin
- ✅ **BR-SA-002**: Mandatory fields validation
- ✅ **BR-SA-003**: User must have at least one active role
- ✅ **BR-SA-004**: Role must match user type (Students can't have faculty roles)
- ✅ **BR-SA-005**: Data archival triggers (3-year inactivity)
- ✅ **BR-SA-007**: Separation of Duties - Role conflict detection
- ✅ **BR-SA-008**: Enhanced audit logging with IP and user agent
- ✅ **BR-SA-009**: Emergency access procedures
- ✅ **BR-SA-011**: Unique email and username validation

#### **Automated Tasks**
- ✅ Check and archive inactive users (3+ years)
- ✅ Emergency access expiry monitoring
- ✅ Role expiry tracking

---

### 9. 📧 Email Notifications

#### **Automated Notifications**
- ✅ Account creation welcome email
- ✅ Password reset notifications
- ✅ Role assignment notifications
- ✅ Role reassignment notifications
- ✅ Account deactivation notifications
- ✅ Account archival notifications

#### **Email Reliability**
- ✅ Failed email logging for retry
- ✅ Timestamped error tracking
- ✅ Silent failure handling (non-blocking)

---

### 10. 🎨 User Interface Features

#### **Pages**
- ✅ **User Directory** - Browse and filter all users
- ✅ **Add Student** - Create student accounts with form validation
- ✅ **Add Faculty** - Create faculty accounts
- ✅ **Role Management** - Assign and manage roles
- ✅ **Audit Logs** - View and filter administrative actions
- ✅ **RBAC Dashboard** - View module access permissions

#### **UI Components**
- ✅ Responsive sidebar navigation
- ✅ Modal dialogs for confirmations
- ✅ Toast notifications for user feedback
- ✅ Multi-select filters
- ✅ Form validation with error messages
- ✅ Data tables with pagination
- ✅ Status indicators (active/inactive/archived)
- ✅ Loading states

---

## 🏗️ Technical Architecture

### Backend (Django REST Framework)
- **Thin Views**: API endpoints with minimal logic
- **Services Layer**: All business logic centralized
- **Selectors Layer**: Optimized database queries with `select_related`/`prefetch_related`
- **Serializers**: Input validation and data transformation
- **Constants**: All hardcoded values centralized
- **Models**: Django TextChoices for type safety

### Frontend (React + Vite)
- **Component-based**: Reusable UI components
- **API Service Layer**: Centralized API calls
- **Toast Notifications**: User feedback system
- **Form Validation**: Client-side validation
- **Responsive Design**: Mobile-friendly interface

### Security
- ✅ JWT Authentication
- ✅ Role-based permissions (IsAdminUser, IsAuthenticated)
- ✅ CORS protection
- ✅ Input validation (serializer-level)
- ✅ SQL injection prevention (Django ORM)
- ✅ Audit logging for compliance

---

## 📋 API Endpoints (v1)

### Reference Data
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/departments/` | List all departments | Any authenticated |
| GET | `/batches/` | List all batches | Any authenticated |
| GET | `/programmes/` | List all programmes | Any authenticated |
| GET | `/designations/` | List all designations | Any authenticated |

### User Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/` | List/search users (paginated) | Admin |
| GET | `/users/students/` | List students with filters | Admin |
| GET | `/users/faculty/` | List faculty with filters | Admin |
| GET | `/users/staff/` | List staff with filters | Admin |
| POST | `/users/add-student/` | Create student account | Admin |
| POST | `/users/add-faculty/` | Create faculty account | Admin |
| POST | `/users/add-staff/` | Create staff account | Admin |
| POST | `/users/activate/` | Activate user | Admin |
| POST | `/users/deactivate/` | Deactivate user | Admin |
| POST | `/users/archive/` | Archive user | Admin |
| POST | `/users/reset-password/` | Reset user password | Admin |
| POST | `/users/import/` | Bulk CSV import | Admin |
| GET | `/users/export/` | CSV export | Admin |
| POST | `/users/mail-batch/` | Email passwords to batch | Admin |

### Role Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/roles/` | Get user roles | Any authenticated |
| GET | `/roles/assignments/` | List all role assignments | Admin |
| GET | `/roles/module-access/` | Get module permissions for role | Admin |
| POST | `/roles/assign/` | Assign role to user | Admin |
| PATCH | `/roles/reassign/` | Reassign role | Admin |
| DELETE | `/roles/<id>/revoke/` | Revoke role | Admin |

### Department Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/departments/hierarchy/` | Get department structure | Admin |
| POST | `/departments/assign-hod/` | Assign Head of Department | Admin |

### Audit & Monitoring
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/audit-logs/` | View audit logs (filterable) | Admin |
| GET | `/stats/` | Get user statistics | Admin |

### Advanced Features
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/archived-users/` | List archived users | Admin |
| POST | `/users/switch-role/` | Switch user's active role | Any authenticated |
| GET | `/users/active-role/` | Get user's current active role | Any authenticated |
| POST | `/emergency-access/grant/` | Grant emergency access | Admin |
| POST | `/emergency-access/<id>/revoke/` | Revoke emergency access | Admin |
| GET | `/emergency-access/` | List emergency accesses | Admin |
| POST | `/validate/role-assignment/` | Validate role against business rules | Admin |

---

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python manage.py seed_data  # Seed initial reference data
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Default Credentials
- **Username**: admin
- **Password**: admin123

---

## 🧪 Testing

```bash
cd backend
python manage.py test system_admin.tests
python test_role_assignment.py  # Test role assignment
python test_create_student.py   # Test student creation
```

---

## 📝 Audit Compliance

All 23 audit fixes implemented (S1-S14, R1-R7, BR-SA-001 to BR-SA-011)

---

## 🏛️ Institution

**IIITDM Jabalpur** - Indian Institute of Information Technology, Design and Manufacturing, Jabalpur

---

## 📄 License

Internal use - IIITDM Jabalpur

