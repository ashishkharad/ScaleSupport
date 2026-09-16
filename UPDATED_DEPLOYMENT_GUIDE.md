# ScaleSupport – Updated Cross-Device Version

## What was fixed

This version changes the important data flow so that submitted application data is shared through Firebase Firestore instead of browser localStorage.

### Fixed items
- Admin-created users are stored in Firestore.
- User ID / username / email / Agent ID credentials are checked by a Firebase server function.
- Successful login receives a Firebase custom authentication token.
- Accounts are stored in Firestore and synchronized in real time.
- Account allocations and allocation histories are stored in Firestore.
- Browser localStorage is no longer used as the source of truth for business records.
- The old Node server also persists users to `data/srms_users.json` when used locally.

## Important

The Firebase Function must be deployed. Without the function, the new cross-device User ID / Password login will not work on Firebase Hosting.

## Simple deployment

From this project folder:

1. Install packages:
   `npm install`
2. Build the website:
   `npm run build`
3. Install Firebase CLI if needed:
   `npm install -g firebase-tools`
4. Sign in:
   `firebase login`
5. Deploy Hosting + Function + Firestore rules:
   `firebase deploy --only hosting,functions,firestore:rules`

After deployment:

1. Open the website.
2. Login as `admin` with the existing administrator password.
3. Create a new agent/user.
4. Wait a few seconds for the Firestore save to complete.
5. Open the website in another browser/device.
6. Login with that new User ID and password.
7. The user and shared Firestore data should be available there too.

Do not use browser localStorage as a backup for application records. Firestore is the central data store in this version.
