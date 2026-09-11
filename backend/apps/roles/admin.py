from django.contrib import admin
from .models import Role, MemberRole


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'rank')
    list_filter = ('category',)
    search_fields = ('code', 'name', 'description')
    ordering = ('rank', 'name')


@admin.register(MemberRole)
class MemberRoleAdmin(admin.ModelAdmin):
    list_display = ('member', 'role', 'start_date', 'end_date', 'is_current')
    list_filter = ('is_current', 'role__category', 'role')
    search_fields = ('member__first_name', 'member__last_name', 'role__name', 'notes')
    ordering = ('-is_current', 'role__rank')
