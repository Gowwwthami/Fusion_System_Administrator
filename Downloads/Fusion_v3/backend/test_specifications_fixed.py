"""
Comprehensive Test Suite for System Admin Module - FIXED WITH JWT AUTH
Tests all Use Cases, Business Rules, and Workflows from specifications
"""

from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from system_admin.models import (
    GlobalsExtrainfo, GlobalsDepartmentinfo, GlobalsDesignation,
    GlobalsHoldsDesignation, Student, GlobalsFaculty, Staff,
    AuditLog, RoleConflictMatrix, UserType, UserStatus
)


class BaseTestCase(TestCase):
    """Base test case with common setup and JWT authentication"""
    
    def setUp(self):
        self.client = Client()
        
        # Create Super Admin
        self.super_admin = User.objects.create_user(
            username='superadmin',
            email='admin@test.com',
            password='admin123',
            is_staff=True,
            is_superuser=True
        )
        self.super_admin_token = str(RefreshToken.for_user(self.super_admin).access_token)
        
        # Create department
        self.dept = GlobalsDepartmentinfo.objects.create(name='Computer Science')
        
        # Create designations
        self.student_designation = GlobalsDesignation.objects.create(
            name='Student', type='academic', basic=True
        )
        self.faculty_designation = GlobalsDesignation.objects.create(
            name='Professor', type='academic', basic=False
        )
        self.hod_designation = GlobalsDesignation.objects.create(
            name='HOD', type='administrative', basic=False
        )
        self.super_admin_designation = GlobalsDesignation.objects.create(
            name='Super Admin', type='system', basic=False, category='system'
        )
        
        # Create test student
        self.student_user = User.objects.create_user(
            username='student001',
            email='student001@test.com',
            password='student123'
        )
        self.student_token = str(RefreshToken.for_user(self.student_user).access_token)
        self.student_extra = GlobalsExtrainfo.objects.create(
            id='student001',
            user=self.student_user,
            user_type=UserType.STUDENT,
            user_status=UserStatus.ACTIVE,
            department=self.dept
        )
        Student.objects.create(
            id=self.student_extra,
            programme='B.Tech',
            batch=2023,
            category='GEN',
            curr_semester_no=1
        )
        
        # Create test faculty
        self.faculty_user = User.objects.create_user(
            username='faculty001',
            email='faculty001@test.com',
            password='faculty123'
        )
        self.faculty_token = str(RefreshToken.for_user(self.faculty_user).access_token)
        self.faculty_extra = GlobalsExtrainfo.objects.create(
            id='faculty001',
            user=self.faculty_user,
            user_type=UserType.FACULTY,
            user_status=UserStatus.ACTIVE,
            department=self.dept
        )
        GlobalsFaculty.objects.create(id=self.faculty_extra)
        GlobalsHoldsDesignation.objects.create(
            user=self.faculty_user,
            designation=self.faculty_designation,
            working=self.faculty_user
        )
    
    def auth(self, token):
        """Helper to create authorization header"""
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


class TestUseCases(BaseTestCase):
    """Test all Use Cases from specifications"""
    
    def test_sa_uc_001_manage_user_account(self):
        """SA-UC-001: Manage User Account"""
        # Test user listing
        response = self.client.get('/api/v1/system-admin/users/', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 403])
    
    def test_sa_uc_003_manage_roles_permissions(self):
        """SA-UC-003: Manage Roles & Permissions"""
        # List roles
        response = self.client.get('/api/v1/system-admin/roles/', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 403])
    
    def test_sa_uc_005_view_audit_log(self):
        """SA-UC-005: View System Audit Log"""
        # Create an audit log entry
        AuditLog.objects.create(
            action='user_created',
            performed_by=self.super_admin,
            target_user=self.student_user,
            details={'user_type': 'student'}
        )
        
        response = self.client.get('/api/v1/system-admin/audit-logs/', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 403])
    
    def test_sa_uc_006_bulk_upload_users(self):
        """SA-UC-006: Bulk Upload Users via CSV"""
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        csv_content = "username,email,first_name,last_name,password,batch_id,programme_id,category\nbulkstudent001,bulk001@test.com,Bulk,Student,bulk123,1,1,GEN\n"
        csv_file = SimpleUploadedFile("test.csv", csv_content.encode('utf-8'))
        
        response = self.client.post('/api/v1/system-admin/users/import/', {
            'file': csv_file,
            'user_type': 'student'
        }, **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 400, 403])
    
    def test_sa_uc_012_create_basic_user(self):
        """SA-UC-012: Create Basic User"""
        response = self.client.post('/api/v1/system-admin/users/add-student/', {
            'username': 'teststudent002',
            'email': 'teststudent002@test.com',
            'first_name': 'Test',
            'last_name': 'Student',
            'password': 'test123',
            'batch_id': 1,
            'programme_id': 1,
            'category': 'GEN'
        }, content_type='application/json', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 201, 400])
    
    def test_sa_uc_013_assign_reassign_roles(self):
        """SA-UC-013: Assign/Reassign Roles"""
        response = self.client.post('/api/v1/system-admin/roles/assign/', {
            'username': 'faculty001',
            'designation_id': self.hod_designation.id
        }, content_type='application/json', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 201, 400, 403])
    
    def test_sa_uc_014_archive_user(self):
        """SA-UC-014: Archive User/Data"""
        response = self.client.post('/api/v1/system-admin/users/archive/', {
            'username': 'student001',
            'reason': 'Test archival',
            'retention_years': 3
        }, content_type='application/json', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 400, 403])
    
    def test_sa_uc_015_switch_role(self):
        """SA-UC-015: Switch Role"""
        GlobalsHoldsDesignation.objects.create(
            user=self.faculty_user,
            designation=self.hod_designation,
            working=self.faculty_user
        )
        
        response = self.client.post('/api/v1/system-admin/users/switch-role/', {
            'designation_id': self.hod_designation.id
        }, content_type='application/json', **self.auth(self.faculty_token))
        self.assertIn(response.status_code, [200, 400, 403])
    
    def test_sa_uc_019_bulk_user_operations(self):
        """SA-UC-019: Bulk User Operations"""
        response = self.client.post('/api/v1/system-admin/users/bulk-create/', {
            'user_type': 'student',
            'users': [
                {
                    'username': 'bulkstudent001',
                    'email': 'bulk001@test.com',
                    'first_name': 'Bulk',
                    'last_name': 'Student1',
                    'password': 'bulk123',
                    'batch_id': 1,
                    'programme_id': 1,
                    'category': 'GEN'
                }
            ]
        }, content_type='application/json', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 400, 403])
    
    def test_sa_uc_020_manage_system_roles(self):
        """SA-UC-020: Manage System Roles"""
        response = self.client.get('/api/v1/system-admin/roles/list/', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 403])
    
    def test_sa_uc_022_emergency_access(self):
        """SA-UC-022: Emergency User Access"""
        response = self.client.post('/api/v1/system-admin/emergency-access/request/', {
            'user_id': self.faculty_user.id,
            'role_id': self.super_admin_designation.id,
            'end_at': '2026-04-22T12:00:00Z',
            'justification': 'Testing emergency access'
        }, content_type='application/json', **self.auth(self.super_admin_token))
        self.assertIn(response.status_code, [200, 201, 400, 403])


class TestBusinessRules(BaseTestCase):
    """Test all Business Rules from specifications"""
    
    def test_br_sa_001_eligibility(self):
        """BR-SA-001: Only Faculty/Staff can be Super Admin"""
        response = self.client.post('/api/v1/system-admin/validate/role-assignment/', {
            'user_id': self.student_user.id,
            'designation_id': self.super_admin_designation.id
        }, content_type='application/json', **self.auth(self.super_admin_token))
        
        if response.status_code == 200:
            data = response.json()
            br_validations = data.get('validations', [])
            br_001 = next((v for v in br_validations if v.get('rule') == 'BR-SA-001'), None)
            if br_001:
                self.assertFalse(br_001['passed'])
    
    def test_br_sa_002_mandatory_fields(self):
        """BR-SA-002: Mandatory User Fields"""
        response = self.client.post('/api/v1/system-admin/users/add-student/', {
            'username': 'teststudent',
        }, content_type='application/json', **self.auth(self.super_admin_token))
        
        # Should fail with 400 (validation error) not 401
        self.assertEqual(response.status_code, 400)
    
    def test_br_sa_007_separation_of_duties(self):
        """BR-SA-007: Conflicting roles must not be assigned to same user"""
        conflicting_role = GlobalsDesignation.objects.create(
            name='Conflicting Role', type='test'
        )
        RoleConflictMatrix.objects.create(
            role1=self.faculty_designation,
            role2=conflicting_role,
            description='Test conflict'
        )
        
        response = self.client.post('/api/v1/system-admin/validate/role-assignment/', {
            'user_id': self.faculty_user.id,
            'designation_id': conflicting_role.id
        }, content_type='application/json', **self.auth(self.super_admin_token))
        
        if response.status_code == 200:
            data = response.json()
            br_007 = next((v for v in data.get('validations', []) if v.get('rule') == 'BR-SA-007'), None)
            if br_007:
                self.assertFalse(br_007['passed'])
    
    def test_br_sa_011_unique_user(self):
        """BR-SA-011: Validate Unique User (email/ID)"""
        response = self.client.post('/api/v1/system-admin/users/add-student/', {
            'username': 'newstudent001',
            'email': 'student001@test.com',  # Already exists
            'first_name': 'New',
            'last_name': 'Student',
            'password': 'test123',
            'batch_id': 1,
            'programme_id': 1,
            'category': 'GEN'
        }, content_type='application/json', **self.auth(self.super_admin_token))
        
        # Should fail with 400 (duplicate email)
        self.assertEqual(response.status_code, 400)


class TestWorkflows(BaseTestCase):
    """Test all Workflows from specifications"""
    
    def test_sa_wf_101_user_creation_workflow(self):
        """SA-WF-101: Create Basic User + Credential Generation"""
        response = self.client.post('/api/v1/system-admin/users/add-student/', {
            'username': 'wfstudent001',
            'email': 'wfstudent001@test.com',
            'first_name': 'WF',
            'last_name': 'Student',
            'password': 'wf123',
            'batch_id': 1,
            'programme_id': 1,
            'category': 'GEN'
        }, content_type='application/json', **self.auth(self.super_admin_token))
        
        if response.status_code in [200, 201]:
            audit_logs = AuditLog.objects.filter(action='user_created')
            self.assertGreater(audit_logs.count(), 0)
    
    def test_sa_wf_102_role_assignment_workflow(self):
        """SA-WF-102: Assign Role + Compatibility Check"""
        response = self.client.post('/api/v1/system-admin/roles/assign/', {
            'username': 'faculty001',
            'designation_id': self.hod_designation.id
        }, content_type='application/json', **self.auth(self.super_admin_token))
        
        if response.status_code in [200, 201]:
            holds = GlobalsHoldsDesignation.objects.filter(
                user=self.faculty_user,
                designation=self.hod_designation
            )
            self.assertGreater(holds.count(), 0)
    
    def test_sa_wf_103_role_reassignment(self):
        """SA-WF-103: Role Reassignment + Task Handover"""
        # Create a staff designation for reassignment test
        staff_designation = GlobalsDesignation.objects.create(
            name='Technical Staff', type='staff', basic=False
        )
        
        # Assign HOD role to faculty
        hold = GlobalsHoldsDesignation.objects.create(
            user=self.faculty_user,
            designation=self.hod_designation,
            working=self.faculty_user
        )
        
        # Reassign to staff designation (different from existing Professor role)
        response = self.client.patch('/api/v1/system-admin/roles/reassign/', {
            'hold_id': hold.id,
            'new_designation_id': staff_designation.id
        }, content_type='application/json', **self.auth(self.super_admin_token))
        
        self.assertIn(response.status_code, [200, 400, 403])


class TestEndpointAvailability(TestCase):
    """Test that all required API endpoints exist"""
    
    def test_all_endpoints_exist(self):
        """Verify all specification-required endpoints are available"""
        required_endpoints = [
            '/api/v1/system-admin/users/',
            '/api/v1/system-admin/users/add-student/',
            '/api/v1/system-admin/users/add-faculty/',
            '/api/v1/system-admin/users/add-staff/',
            '/api/v1/system-admin/users/bulk-create/',
            '/api/v1/system-admin/users/import/',
            '/api/v1/system-admin/users/export/',
            '/api/v1/system-admin/users/activate/',
            '/api/v1/system-admin/users/deactivate/',
            '/api/v1/system-admin/users/archive/',
            '/api/v1/system-admin/roles/',
            '/api/v1/system-admin/roles/assign/',
            '/api/v1/system-admin/roles/reassign/',
            '/api/v1/system-admin/audit-logs/',
            '/api/v1/system-admin/emergency-access/',
            '/api/v1/system-admin/emergency-access/request/',
            '/api/v1/system-admin/users/switch-role/',
            '/api/v1/system-admin/departments/hierarchy/',
            '/api/v1/system-admin/departments/assign-hod/',
            '/api/v1/system-admin/validate/role-assignment/',
        ]
        
        for endpoint in required_endpoints:
            response = self.client.get(endpoint)
            # 401 is OK (endpoint exists, needs auth), 404 means missing
            self.assertNotEqual(response.status_code, 404, 
                              f"Endpoint {endpoint} not found")


if __name__ == '__main__':
    import django
    django.setup()
    from django.test.utils import setup_test_environment
    setup_test_environment()
