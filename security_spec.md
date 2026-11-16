# Security Specification — Arabs Guide in Russia

## 1. Data Invariants
1. Default-deny catch-all rule rejects all reads and writes unless explicitly matched.
2. Only verified administrators (`isAdmin()`, requiring `request.auth.token.email_verified == true` and either the bootstrapped admin email `omaratef11110@gmail.com` or an `/admins/{uid}` document) may create, update, or delete directory records (`places`, `offers`, `services`) or manage `/admins`.
3. Public directory listings (`places`, `places/{placeId}/offers`, `services`) are publicly readable so tourists and students can browse and cache offline packs.
4. Every single-document target (`get`, `create`, `update`, `delete`) enforces `isValidId(docId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
5. Every `Offer` under `/places/{placeId}/offers/{offerId}` enforces `exists(/databases/$(database)/documents/places/$(placeId))` and `incoming().placeId == placeId` (Master Gate relational integrity).
6. Timestamps `createdAt` and `updatedAt` must equal `request.time`; `createdAt` and `createdBy` are immutable on updates.
7. Every string validates `.size()` bounds; arrays (`languagesSpoken`, `languagesSpokenAr`) enforce `1 <= size() <= 10` and `list[0] is string && list[0].size() <= 40`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Place Create**: `POST /places/p1` with `auth == null`.
2. **Non-Admin Authenticated Place Create**: Signed-in non-admin user attempts `create` on `/places/p1`.
3. **Unverified Admin Email Spoof**: User with `email == 'omaratef11110@gmail.com'` and `email_verified == false` attempts `create` on `/places/p1`.
4. **Shadow Field Injection on Place**: Admin sends extra `"shadowFlag": true` key in `create` payload -> blocked by `keys().hasOnly(...)`.
5. **Identity Spoofing on Create**: Admin sets `createdBy` to `"another_uid"` instead of `request.auth.uid` -> blocked by `data.createdBy == request.auth.uid`.
6. **Client-Forged Timestamp**: Admin sends `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> blocked by `incoming().createdAt == request.time`.
7. **Immutable Field Tampering on Update**: Admin attempts to modify `createdAt` or `createdBy` during `update` -> blocked by `affectedKeys().hasOnly(...)` + equality invariant.
8. **ID Poisoning Attack**: Admin attempts `create` with `placeId` containing spaces or `../` or >128 chars -> blocked by `isValidId(placeId)`.
9. **Orphan Offer Write**: Admin attempts to create `/places/nonexistent_id/offers/off1` -> blocked by `exists(/databases/$(database)/documents/places/$(placeId))`.
10. **Coordinate Out-of-Range Poisoning**: Admin creates a Place with `latitude: 999.0` -> blocked by `latitude >= -90 && latitude <= 90`.
11. **Array Type / Unbounded Array Attack**: Admin creates a Service with `languagesSpoken: [123]` or 25 elements -> blocked by `size() <= 10 && languagesSpoken[0] is string`.
12. **Privilege Escalation on Admins**: Non-admin authenticated user attempts `create` on `/admins/{ownUid}` -> blocked by `isAdmin()`.
