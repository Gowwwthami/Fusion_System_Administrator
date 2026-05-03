from rest_framework.permissions import BasePermission


class IsSuperAdminRole(BasePermission):
    """Allow access only to authenticated users holding the Super Admin role."""

    message = "Super Admin role required"

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Allow Django superusers to access super-admin endpoints.
        if getattr(user, "is_superuser", False):
            return True

        try:
            from .models import GlobalsHoldsDesignation

            return GlobalsHoldsDesignation.objects.filter(
                user__user=user,
                designation__name__iexact="Super Admin",
                working=True,
            ).exists()
        except Exception:
            return False