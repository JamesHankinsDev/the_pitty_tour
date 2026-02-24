# PITY Tour — Setup Guide

## 1. Firebase Project Setup

### A. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → Name it `pity-tour` (or similar)
3. Enable Google Analytics (optional)

### B. Enable Authentication
1. Build → Authentication → Get Started
2. Sign-in method → **Google** → Enable
3. Set your Project support email
4. Save

### C. Enable Firestore
1. Build → Firestore Database → Create database
2. Start in **production mode** (we'll deploy rules separately)
3. Choose your region (e.g., `us-central1`)

### D. Enable Storage (optional, for future features)
1. Build → Storage → Get Started
2. Start in production mode

### E. Get Configuration Keys
1. Project Settings (gear icon) → General → Your apps
2. Click **Add app** → Web (`</>`)
3. Register app → Copy the `firebaseConfig` object
4. Fill in `.env.local` with those values

---

## 2. Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in all the Firebase config values from step 1E.

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login
firebase login

# Initialize (select your project)
firebase use --add

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

---

## 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 6. First Admin Setup

After first login:
1. Sign in with Google
2. Complete your profile
3. In the Firebase Console → Firestore → `users` collection
4. Find your document (your UID)
5. Set `isAdmin: true`
6. Refresh the app — you'll see the Admin panel

---

## 7. Create First Season

1. Go to Admin → Seasons
2. Create a new season with:
   - Year: 2025 (or current year)
   - Start Month: 4 (April)
   - End Month: 11 (November)
   - Registration Fee: 100
   - Monthly Due: 50
3. Click **Set Active**

---

## 8. Firebase Hosting Deployment

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Build the app
npm run build

# Deploy
firebase deploy
```

Or use the Frameworks-aware hosting (recommended for Next.js):

```bash
# Initialize Firebase Hosting with Next.js framework support
firebase init hosting
# Select: Use an existing project → your project
# Choose: Next.js framework

npm run build
firebase deploy
```

---

## Firestore Index Requirements

All required indexes are in `firestore.indexes.json` and will be deployed with:
```bash
firebase deploy --only firestore:indexes
```

Key composite indexes needed:
- `rounds`: (uid + submittedAt DESC)
- `rounds`: (uid + month)
- `rounds`: (seasonId + month)
- `rounds`: (seasonId + month + isValid)
- `rounds`: (seasonId + submittedAt DESC)
- `registrations`: (uid + seasonId)
- `registrations`: (seasonId)
- `points`: (uid + seasonId + month)
- `points`: (seasonId)

---

## Architecture Notes

### Points Calculation
Currently the leaderboard computes points in real-time on the client using
`useLeaderboard.ts`. For large leagues, consider:
- Cloud Function trigger on round validation to write to `/points` collection
- This would enable cumulative season standings to be pre-computed

### Monthly Deadline Enforcement
The app shows deadline warnings but doesn't auto-forfeit. Recommended flow:
1. Admin manually marks forfeits in Admin → Prize Pool at month end
2. Or deploy a Cloud Function scheduled for the 1st of each month

### QR Code Scanning
The `html5-qrcode` library requires a modern browser with camera API support.
On iOS, Safari works best. On Android, Chrome works best.

---

## Tech Stack Summary
- **Next.js 14** — App Router, TypeScript
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Radix UI primitives
- **Firebase Auth** — Google Sign-In
- **Firestore** — Real-time NoSQL database
- **sonner** — Toast notifications
- **react-hook-form + zod** — Form validation
- **qrcode.react** — QR code generation
- **html5-qrcode** — QR code scanning
- **date-fns** — Date utilities
