# Cross-device persistence changes

1. Added Firebase HTTPS Function `functions/index.js` for authoritative User ID/password authentication and Firebase custom-token login.
2. Updated Firebase Hosting rewrites so `/api/auth/login` reaches the Firebase Function.
3. Updated Firestore user rules so admins manage all users while non-admin users can only access their own profile.
4. Added Firestore persistence/listeners for allocations and allocation histories.
5. Disabled browser localStorage hydration/persistence for core business records in `SRMSContext`.
6. Kept Firebase Firestore as the primary source for accounts, recoveries, PTPs, visits, photos, documents, and users.
7. Added local Node user-file persistence as a fallback for local/server deployments.
