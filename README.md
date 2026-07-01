# Fred again.. Listening Party

Private invite-only listening party site built with pure HTML, CSS, vanilla JavaScript, and Firebase Firestore via CDN modules.

## File Structure

```text
index.html
admin.html
css/styles.css
js/background-images.js
js/firebase-init.js
js/application-form.js
js/guest-status.js
js/requests.js
js/admin.js
js/animations.js
assets/
firebase-config.example.js
```

## Firebase Setup

1. Create a Firebase project.
2. Enable Firestore Database.
3. Copy `firebase-config.example.js` to `firebase-config.js`.
4. Paste your Firebase web app config into `firebase-config.js`.
5. Keep `firebase-config.js` private. It is already gitignored.

Example admin passcode document:

```text
Collection: settings
Document: admin
Field: passcode
Value: your-private-passcode
```

The static admin passcode is a convenience gate for a private event. A client-only site cannot truly hide privileged Firestore access from a determined user without Firebase Auth, custom claims, or a backend function.

## Change Event Limits

Edit `EVENT_CONFIG` in `firebase-config.js`:

```js
export const EVENT_CONFIG = {
  MAX_GUESTS: 120,
  MAX_PARTY_SIZE: 4,
  EVENT_DATE: "2026-08-15T20:30:00+05:30",
  EVENT_LOCATION: "Revealed when approved",
  ARRIVAL_TIME: "Saturday, 8:30 PM",
  DRESS_CODE: "Black, silver, something you can move in"
};
```

## Swap Background Images

Replace the files in `assets/`, or edit `js/background-images.js`:

```js
export const BACKGROUND_IMAGES = {
  hero: "assets/hero.jpg",
  confirmation: "assets/confirmation.jpg",
  approved: "assets/approved.jpg"
};
```

## Firestore Collections

- `applications`: form submissions and host review data
- `status_lookup`: minimal public status records populated by the admin dashboard
- `approved_guests`: public approved guest list populated by the admin dashboard
- `song_requests`: approved guest request wall
- `settings/admin`: passcode document

## Security Rules Starting Point

Paste and adapt in the Firebase console. These rules are intentionally conservative for public writes and public approved guest/request reads. True admin-only reads/writes require Firebase Auth/custom claims or a trusted backend.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    match /applications/{id} {
      allow create: if true
        && request.resource.data.status == "pending"
        && request.resource.data.email is string
        && request.resource.data.party_size <= 4;
      allow read, update, delete: if isAdmin();
    }

    match /status_lookup/{id} {
      allow get: if true;
      allow list: if false;
      allow create: if request.resource.data.status == "pending"
        && request.resource.data.email is string;
      allow update, delete: if isAdmin();
    }

    match /approved_guests/{id} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /song_requests/{id} {
      allow read: if true;
      allow create: if true
        && request.resource.data.track is string
        && request.resource.data.artist is string
        && request.resource.data.votes == 0;
      allow update: if request.resource.data.diff(resource.data).changedKeys().hasOnly(["votes"])
        && request.resource.data.votes == resource.data.votes + 1;
      allow delete: if isAdmin();
    }

    match /settings/{id} {
      allow read, write: if isAdmin();
    }
  }
}
```

For the included passcode-only demo, you may temporarily loosen admin reads/writes while testing in a private project, then replace with Auth before sharing the admin URL.

## Deployment

GitHub Pages:

1. Push the folder to GitHub.
2. In repository settings, enable Pages from the main branch root.
3. Add `firebase-config.js` locally before deploying, or inject it in your deploy process.

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
