"""
Sérialiseurs pour l'API du journal d'audit immuable.
"""

from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, default=None)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_email',
            'action',
            'action_display',
            'entity',
            'entity_id',
            'old_values',
            'new_values',
            'ip_address',
            'created_at',
        ]
        read_only_fields = fields
