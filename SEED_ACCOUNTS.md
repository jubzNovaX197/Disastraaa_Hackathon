# Disastraaa — Verified Seed Accounts & Authentication Documentation

> **Note:** All data below represents **simulated test personas** created for local hackathon testing and evaluation. These are not real government records.

---

## 1. Verified Operational Test Accounts (Real Database Store)

The following accounts are pre-seeded in the real user store (`src/lib/auth/users.ts`) with salted and hashed passwords (`crypto.scrypt`). They can be used immediately to sign in via the real `/login` portal.

| Role | Authority ID | Official Email | Test Password | Department & Jurisdiction |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `DIS-SUPER-001` | `superadmin@disastraaa.gov.demo` | `Password123!` | Platform Governance · NDIC |
| **NATIONAL_AUTHORITY** | `DIS-NAT-001` | `ops@ndma.gov.demo` | `Password123!` | National Operations Command · Pan-India |
| **STATE_AUTHORITY** | `DIS-STATE-OD-001` | `commissioner@osdma.gov.demo` | `Password123!` | State Emergency Operations Center · Odisha |
| **DISTRICT_AUTHORITY** | `DIS-DIST-BRG-001` | `collector@bargarh.nic.demo` | `Password123!` | District Emergency Operations Cell · Bargarh, Odisha |
| **FIELD_OPERATOR** | `DIS-FIELD-BRG-001` | `fieldops@ndrf.gov.demo` | `Password123!` | Tactical Field Response · Bargarh Sector, Odisha |
| **CITIZEN / PUBLIC** | *(None)* | `citizen@example.demo` | `Password123!` | Registered Citizen · Bhubaneswar, Odisha |

---

## 2. Public Website Navigation

The top navigation bar provides three completely separate entry points:

- **Login** (`/login`): Real email + password authentication. Issues an HTTP-only HMAC session cookie (`disastraaa-session`).
- **Register** (`/register`): Real two-path registration portal:
  - **Citizen / Public Account**: Name, email, phone, location consent, password.
  - **Authority Account**: Authority ID + official email verification, password creation.
- **Demo** (`/demo`): Instant non-destructive demo persona switching (`disastraaa-user-role` cookie). Does **not** modify or create real accounts.

---

## 3. Authority Authorization & Invitation Architecture

In Disastraaa, authority employees **cannot arbitrarily self-register or select their own role/department/scope**.

### Invitation Workflow:

1. **Authorization Creation**:
   A higher-level authority logs in and visits **Personnel Management** (`/personnel` or `/governance`).
   - Clicks **Invite Personnel**.
   - Enters the employee's official email, department, role, and jurisdiction.
   - The server validates the inviter's RBAC privileges:
     - `SUPER_ADMIN` can authorize National, State, District, and Field.
     - `NATIONAL_AUTHORITY` can authorize National, State, District, and Field.
     - `STATE_AUTHORITY` can authorize District and Field (within state).
     - `DISTRICT_AUTHORITY` can authorize Field (within district).
     - `FIELD_OPERATOR` and `CITIZEN` cannot authorize any accounts.
     - Lower authorities can never authorize equal or higher roles.
     - Super Admin cannot be created through invitations.
2. **Authority ID Generation**:
   The server generates an Authority ID (e.g. `IN-DST-BRG-002`) and stores a pending authorization record.
3. **Employee Activation**:
   The employee visits `/register`, selects **Authority Account**, and enters:
   - Authority ID (e.g. `DIS-DIST-BRG-001` or newly generated ID)
   - Official Email
   - Password & Confirmation
4. **Verification & Activation**:
   The server verifies that the Authority ID and official email match an active authorization record. A single-use, expiring 6-digit OTP verification code is dispatched. Upon verification, the user account is created with role, department, and scope copied directly from the server-side record.

---

## 4. Security Highlights

- **Server-Side Role & Scope Enforcement**: Roles, departments, and geographic scopes are never accepted from client requests.
- **Credential Protection**: Passwords are never displayed in the browser UI, logged to console, or returned in API responses.
- **Session Security**: HMAC-SHA256 signed session cookies with `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- **Edge Middleware Protection**: Dashboard routes (`/dashboard`, `/personnel`, `/governance`, etc.) strictly require authentication; unauthenticated visits redirect to `/login`.
