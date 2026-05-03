"""
Quick Test Runner for System Admin Specifications
Run this to verify all specifications are met
"""

import subprocess
import sys
import os

def run_tests():
    """Run the specification test suite"""
    print("=" * 80)
    print("FUSION ERP SYSTEM ADMIN - SPECIFICATION VERIFICATION TESTS")
    print("=" * 80)
    print()
    
    # Change to backend directory
    os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))
    
    # Run tests
    print("Running tests...")
    print("-" * 80)
    
    result = subprocess.run(
        [sys.executable, 'manage.py', 'test', 'test_specifications', '-v', '2'],
        capture_output=False,
        text=True
    )
    
    print()
    print("=" * 80)
    if result.returncode == 0:
        print("✅ ALL TESTS PASSED")
    else:
        print("⚠️  SOME TESTS FAILED - Check output above for details")
    print("=" * 80)
    
    return result.returncode

if __name__ == '__main__':
    exit_code = run_tests()
    sys.exit(exit_code)
