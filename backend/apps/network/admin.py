from django.contrib import admin
from .models import (
    SkillCategory,
    Skill,
    MemberSkill,
    ServiceCatalog,
    MemberService,
    MemberAvailability,
    MemberRelation,
)


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'display_order']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active']
    list_filter = ['category', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(MemberSkill)
class MemberSkillAdmin(admin.ModelAdmin):
    list_display = ['member', 'skill', 'level', 'years_experience', 'is_verified', 'verified_by']
    list_filter = ['level', 'is_verified', 'skill__category']
    search_fields = ['member__first_name', 'member__last_name', 'member__matricule', 'skill__name']


@admin.register(ServiceCatalog)
class ServiceCatalogAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_order']
    search_fields = ['name']


@admin.register(MemberService)
class MemberServiceAdmin(admin.ModelAdmin):
    list_display = ['title', 'member', 'service', 'service_type', 'contact_mode', 'is_active']
    list_filter = ['service_type', 'contact_mode', 'is_active']
    search_fields = ['title', 'member__first_name', 'member__last_name', 'member__matricule']


@admin.register(MemberAvailability)
class MemberAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['member', 'status', 'open_for_mentoring', 'open_for_dahirah_events', 'open_for_pro_help']
    list_filter = ['status', 'open_for_mentoring', 'open_for_dahirah_events', 'open_for_pro_help']
    search_fields = ['member__first_name', 'member__last_name', 'member__matricule']


@admin.register(MemberRelation)
class MemberRelationAdmin(admin.ModelAdmin):
    list_display = ['from_member', 'to_member', 'relation_type', 'status', 'approved_by']
    list_filter = ['relation_type', 'status']
    search_fields = [
        'from_member__first_name', 'from_member__last_name', 'from_member__matricule',
        'to_member__first_name', 'to_member__last_name', 'to_member__matricule'
    ]
