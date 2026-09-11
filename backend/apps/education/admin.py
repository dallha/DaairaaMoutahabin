from django.contrib import admin
from .models import Education


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ('member', 'field', 'level', 'institution', 'status', 'start_year', 'end_year')
    list_filter = ('level', 'status', 'institution')
    search_fields = ('field', 'institution', 'diploma', 'member__first_name', 'member__last_name')
    ordering = ('-start_year',)
