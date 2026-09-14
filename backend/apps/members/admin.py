from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Member, Contact


class ContactInline(admin.TabularInline):
    model = Contact
    extra = 1
    fields = ('phone', 'whatsapp', 'email', 'city', 'is_primary')


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'first_name', 'last_name', 'is_founder', 'is_president', 'institutional_priority', 'status', 'visibility_level', 'joined_at', 'is_deleted')
    list_filter = ('is_founder', 'is_president', 'status', 'situation', 'gender', 'visibility_level', 'is_deleted')
    search_fields = ('matricule', 'first_name', 'last_name', 'contacts__phone')
    ordering = ('institutional_priority', 'last_name', 'first_name')
    readonly_fields = ('matricule', 'created_at', 'updated_at')
    inlines = [ContactInline]
    actions = ['restore_members', 'soft_delete_members']

    fieldsets = (
        (_('Identification'), {
            'fields': ('matricule', 'user', 'first_name', 'last_name', 'gender', 'birth_date', 'photo')
        }),
        (_('Statut Protocolaire & Institutionnel'), {
            'fields': ('is_founder', 'is_president', 'institutional_priority')
        }),
        (_('Situation & Statut'), {
            'fields': ('situation', 'status', 'visibility_level', 'joined_at', 'notes')
        }),
        (_('Administration & Métadonnées'), {
            'fields': ('is_deleted', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        """Permet aux administrateurs de visualiser aussi les membres soft-deleted dans l'admin."""
        return Member.all_objects.all()

    @admin.action(description=_('Restaurer les membres sélectionnés'))
    def restore_members(self, request, queryset):
        queryset.update(is_deleted=False)

    @admin.action(description=_('Supprimer logiquement (Soft delete) les membres sélectionnés'))
    def soft_delete_members(self, request, queryset):
        queryset.update(is_deleted=True)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('member', 'phone', 'whatsapp', 'email', 'city', 'country', 'is_primary')
    list_filter = ('is_primary', 'city', 'country')
    search_fields = ('phone', 'whatsapp', 'email', 'member__first_name', 'member__last_name')


from .models import MatriculeSequence


@admin.register(MatriculeSequence)
class MatriculeSequenceAdmin(admin.ModelAdmin):
    list_display = ('year', 'last_sequence', 'updated_at')
    readonly_fields = ('year', 'last_sequence', 'updated_at')
    ordering = ('-year',)

