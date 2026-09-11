from django.contrib import admin
from .models import ProfessionCategory, Profession, MemberProfession


@admin.register(ProfessionCategory)
class ProfessionCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'display_order')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)
    ordering = ('display_order', 'name')


@admin.register(Profession)
class ProfessionAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'is_active')
    list_filter = ('category', 'is_active')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'category__name')
    ordering = ('category', 'name')


@admin.register(MemberProfession)
class MemberProfessionAdmin(admin.ModelAdmin):
    list_display = ('member', 'title', 'profession', 'organization', 'is_primary', 'is_current')
    list_filter = ('is_primary', 'is_current', 'profession__category')
    search_fields = ('title', 'organization', 'member__first_name', 'member__last_name', 'profession__name')
