# P0-03: Fix Dynamic require('crypto') in auth.ts

## Current Problem
`src/lib/auth.ts` uses `require('crypto')` at runtime:
```typescript
export function hashPassword(password: string): string {
  const crypto = require('crypto')  // ← Dynamic require inside function
  ...
}
export function verifyPassword(password: string, stored: string): boolean {
  const crypto = require('crypto')  // ← Same pattern
  ...
}
```

This was done to avoid Edge Runtime bundler errors (Next.js middleware can't import Node.js modules). The side effect: `require()` is synchronous and slow, TypeScript loses type safety, and it masks bundler issues that should be fixed properly.

## Implementation

### Change 1 — Split auth into two files
```typescript
// src/lib/auth-edge.ts  (for middleware — no Node.js crypto)
import { SignJWT, jwtVerify } from 'jose'
export { signToken, verifyToken, getSession }

// src/lib/auth.ts  (for server API routes)
import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'  // ← Static import, works because API routes run on Node.js
export { signToken, verifyToken, getSession }
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}
export function verifyPassword(password: string, stored: string): boolean {
  // ... same logic with static import
}
```

### Change 2 — Update imports
- `middleware.ts` imports from `@/lib/auth-edge`
- All API route files that use `hashPassword`/`verifyPassword` (login route) import from `@/lib/auth`

## Drawbacks
1. **File duplication** — Two files with overlapping exports. If a new auth function is added, it must be added to both files or one must re-export from the other. The correct pattern: `auth-edge.ts` re-exports everything from `auth.ts` except the crypto functions, but that doesn't solve the bundler issue.
2. **Edge Runtime is being deprecated in Next.js** — Next.js 15+ is moving away from the Edge Runtime distinction. This fix may become unnecessary in a future version. However, fixing it now is still correct.
3. **Alternative: Use Web Crypto API** — Instead of splitting files, could replace `crypto.scryptSync` with `crypto.subtle.pbkdf2` (works in Edge Runtime). This would:
   - Keep one file
   - Use the Edge-compatible Web Crypto API
   - But change the password hash format (existing hashes won't verify)
   - Need a migration path for existing users

**Recommendation:** Use the Web Crypto API approach instead of splitting files. It's forward-looking and doesn't require maintaining two files. Existing hashes can be migrated on next login.

## Effort
- File split approach: 1 hour
- Web Crypto API approach: 2 hours
- **Total: 1-2 hours**

## Verification
- Login flow works after deployment
- Existing user passwords still authenticate (for Web Crypto: test with new user only)
