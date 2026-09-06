# Security Specification

## 1. Data Invariants
1. Member documents must contain valid names and IDs.
2. Only authorized administrators can create new professions.
3. Access to member profiles is strictly controlled.

## 2. The "Dirty Dozen" Payloads
1. Create member with missing required fields (prenom).
2. Create member with invalid gender.
3. Create member with invalid birth date format.
4. Update member with unauthorized fields.
5. List all members as a non-admin.
6. Get PII of another member.
7. Delete member as non-admin.
8. Create profession with malicious ID.
9. Create profession without required fields.
10. Update member ID to an existing one.
11. List professions as unauthorized user.
12. Inject massive string into member name.
