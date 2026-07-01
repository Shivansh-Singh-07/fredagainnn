# Fred again.. Listening Party

Private invite-only listening party site built with pure HTML, CSS, vanilla JavaScript, Firebase Google Auth, and Firestore via CDN modules.

## File Structure

```text
index.html
admin.html
firebase-config.js
firebase-config.example.js
css/styles.css
js/background-images.js
js/firebase-init.js
js/auth.js
js/application-form.js
js/guest-status.js
js/admin.js
js/animations.js
assets/
```

## Current Flow

1. Public landing page loads first.
2. User clicks `Continue with Google`.
3. After Google login, the main event site appears.
4. The application form uses the logged-in Google email.
5. The status panel watches the logged-in user's own application by `uid`.
6. If the logged-in email is in `ADMIN_EMAILS`, an `Admin Panel` button appears.
7. The admin dashboard lets the host view, approve, reject, update, and delete registrations.

## Firebase Setup

1. Open Firebase Console.
2. Select project: `private-listening-party`.
3. Go to `Build -> Authentication -> Sign-in method`.
4. Enable `Google`.
5. Go to `Authentication -> Settings -> Authorized domains`.
6. Add these domains:
   - `localhost`
   - `shivansh-singh-07.github.io`
   - your custom domain, if you add one later
7. Go to `Build -> Firestore Database` and create/enable the database.
8. Go to `Firestore Database -> Rules`.
9. Paste the rules from `Firestore Rules` below.
10. Publish the rules.

## Confirm Your Admin Email

Open `firebase-config.js` and confirm this matches the Google account you use for admin:

```js
export const ADMIN_EMAILS = [
  "shivanshsingh7117@gmail.com"
];
```

Use the exact Google email you will login with. Keep it lowercase. The same email is already used in the Firestore rules below:

```js
request.auth.token.email in ["shivanshsingh7117@gmail.com"]
```

## Firestore Rules

Paste this into Firebase Console -> Firestore Database -> Rules.

Important: these rules are already set for `shivanshsingh7117@gmail.com`. If you use a different Google account later, change the email here and in `firebase-config.js`.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return request.auth != null
        && request.auth.token.email in ["shivanshsingh7117@gmail.com"];
    }

    match /applications/{id} {
      allow create: if isSignedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.status == "pending"
        && request.resource.data.party_size <= 4;

      allow read: if isAdmin()
        || (isSignedIn() && resource.data.uid == request.auth.uid);

      allow update, delete: if isAdmin();
    }

    match /users/{uid} {
      allow create, update: if isSignedIn()
        && request.auth.uid == uid;

      allow read, delete: if isAdmin();
    }

  }
}
```

## Change Event Limits

Edit `EVENT_CONFIG` in `firebase-config.js`:

```js
export const EVENT_CONFIG = {
  MAX_GUESTS: 120,
  MAX_PARTY_SIZE: 4,
  EVENT_DATE: "2026-07-18T18:30:00+05:30",
  EVENT_LOCATION: "Qutub Area, Delhi. Exact location shared after RSVP confirmation.",
  ARRIVAL_TIME: "Saturday, 18 July 2026 · 6:30 PM - 1:00 AM",
  DRESS_CODE: "Invite-only. BYOB allowed; venue corkage/setup fee per person applies at the gate."
};
```

## Swap Background Images

Replace files in `assets/`, or edit `js/background-images.js`:

```js
export const BACKGROUND_IMAGES = {
  hero: "assets/hero.jpg",
  confirmation: "assets/confirmation.jpg",
  approved: "assets/approved.jpg"
};
```

## What To Do Whenever Code Is Updated

1. Save all files.
2. Open `firebase-config.js`.
3. Confirm `ADMIN_EMAILS` contains your real Gmail.
4. If README Firestore rules changed, paste the latest rules into Firebase Console and publish.
5. Confirm Google Auth is enabled.
6. Confirm GitHub Pages authorized domain exists in Firebase Auth:
   - `shivansh-singh-07.github.io`
7. Commit and push:

```bash
git add .
git commit -m "Update listening party site"
git push
```

8. Wait 1-3 minutes for GitHub Pages to redeploy.
9. Hard refresh the site:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
10. Test in this order:
   - Landing page appears.
   - Google login works.
   - Main event site appears after login.
   - Application can submit.
   - Status panel changes from `No application found` to `Pending Review`.
   - Admin Panel button appears only for your admin email.
   - Admin dashboard can approve, reject, update, and delete registrations.
   - Approved users see the event details section.

## Troubleshooting

`FirebaseError: Missing or insufficient permissions`

Your Firestore rules do not match the current auth flow, or the signed-in Google account is not `shivanshsingh7117@gmail.com`. Paste the rules above and publish them.

`Cross-Origin-Opener-Policy would block the window.closed call`

This is common noise from Google popup sign-in in Chrome. It is usually harmless if the page shows `Signed in as ...` after login.

`net::ERR_BLOCKED_BY_CLIENT`

Usually an ad blocker/privacy extension blocked a Firebase or Google request. Disable the blocker for your GitHub Pages site and Firebase domains while testing.

Google login fails on GitHub Pages

Add `shivansh-singh-07.github.io` under Firebase Authentication -> Settings -> Authorized domains.

## Deployment

GitHub Pages:

1. Push the repo to GitHub.
2. In repository settings, enable Pages from the main branch root.
3. Wait for deployment.
4. Open the GitHub Pages URL.

Vercel:

1. Import the repository.
2. Framework preset: Other.
3. Build command: leave blank.
4. Output directory: `.`

## Local Preview

Because the app uses ES modules, preview with a local static server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

