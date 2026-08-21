# OkulDesk Security Test Plan

This checklist is the minimum release gate for the production-hardening branch.

## Authentication

- [x] Default admin password is no longer fixed.
- [x] Temporary credentials use cryptographically secure random generation.
- [x] Temporary accounts are forced to change password on first login.
- [x] `mustChangePassword` is read from the database, not trusted solely from the JWT.
- [ ] Verify old JWT behavior after password change with an integration test.
- [ ] Verify role changes take effect immediately with an integration test.
- [ ] Verify login rate limiting with an HTTP integration test.

## Authorization

- [x] Student management routes require authentication and ADMIN role.
- [x] Parent password reset is restricted to ADMIN routes.
- [ ] Verify every administrative route has explicit authorization coverage.
- [ ] Verify parent users cannot access student-management endpoints.

## File Uploads

- [x] Upload size limits are configured.
- [x] Excel uploads use MIME filtering and magic-byte validation.
- [ ] Add malformed XLSX/legacy XLS regression fixtures.
- [ ] Add oversized upload regression test.
- [ ] Verify temporary upload buffers are not persisted after processing.

## Parent Accounts

- [x] Phone suffix is not used as a password.
- [x] New temporary passwords are returned only as part of the import result.
- [x] Reset-password operations are audit logged.
- [ ] Verify phone-number changes cannot desynchronize `Parent.phone` and `User.username`.
- [ ] Verify duplicate phone representations (`+90`, `90`, `05xx`) resolve to one account.
- [ ] Add an admin UI for displaying/copying newly generated credentials.

## Data Protection

- [x] SQLite database files are excluded from source control.
- [x] Backup retention is configured.
- [ ] Verify backup files are not exposed through static HTTP routes.
- [ ] Verify generated PDFs are not publicly enumerable.
- [ ] Review logs for accidental passwords, tokens, or sensitive student data.

## Release Gate

A release should not be marked production-ready until all unchecked integration/security tests above are completed and the clean-machine Tauri installation has been verified.
