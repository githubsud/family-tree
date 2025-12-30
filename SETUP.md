# Setup Instructions

## 1. Firebase Configuration
1.  Create a Firebase Project at [console.firebase.google.com](https://console.firebase.google.com/).
2.  Enable **Authentication** (Email/Password provider).
3.  Enable **Firestore Database**.
4.  Go to Project Settings -> Service Accounts -> **Generate new private key**. Save this JSON.

## 2. Environment Variables
Create a `.env.local` file in the root directory calling the keys from `.env.example`.
- Fill the Client SDK keys matching your Firebase Web App config.
- Fill the Admin SDK keys (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` etc.) from the Service Account JSON.
    - Note: Put the private key in quotes and handle newlines if necessary, or copy the string exactly.

## 3. Create Super Admin
Since the app requires a Super Admin to create other admins:
1.  Go to Firebase Console -> Authentication.
2.  Add a user (e.g., `super@family.com`).
3.  Copy the `User UID`.
4.  Go to Firestore Database.
5.  Create a collection `users`.
6.  Create a document with ID = `<User UID>`.
7.  Add field: `role` (string) = `super_admin`.
8.  Add field: `email` (string) = `super@family.com`.
9.  Add field: `uid` (string) = `<User UID>`.

Now you can log in as Super Admin and create other admins.
