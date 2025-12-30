const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// 1. Load Environment Variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function initDB() {
    console.log("Initializing Database...");

    // 2. Initialize Firebase Admin
    if (!admin.apps.length) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined;

            if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
                throw new Error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in .env.local");
            }

            console.log("Debug Config:");
            console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
            console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
            console.log("Private Key Length:", privateKey.length);
            console.log("Private Key Start/End:", privateKey.substring(0, 20), "...", privateKey.substring(privateKey.length - 20));

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        } catch (e) {
            console.error("Error initializing Firebase Admin:", e.message);
            console.error("Please double-check your .env.local file.");
            process.exit(1);
        }
    }

    const auth = admin.auth();
    const db = admin.firestore();

    // 3. Define Super Admin Details
    const SUPER_ADMIN_EMAIL = "ahabma@gmail.com";
    const SUPER_ADMIN_PASSWORD = "password123"; // Change this after login!

    try {
        // 4. Create or Get User in Auth
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(SUPER_ADMIN_EMAIL);
            console.log("Super Admin user already exists in Auth.");
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log("Creating Super Admin user in Auth...");
                userRecord = await auth.createUser({
                    email: SUPER_ADMIN_EMAIL,
                    password: SUPER_ADMIN_PASSWORD,
                    displayName: "Super Admin",
                });
                console.log("Super Admin user created.");
            } else {
                throw e;
            }
        }

        // 5. Create User Document in Firestore (The "Table" creation part)
        console.log("Setting up Firestore 'users' collection...");
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: SUPER_ADMIN_EMAIL,
            role: 'super_admin',
            createdAt: Date.now()
        }, { merge: true });

        console.log("✅ Database initialized successfully!");
        console.log("-----------------------------------");
        console.log(`Log in with:`);
        console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
        console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
        console.log("-----------------------------------");

    } catch (error) {
        console.error("Initialization failed:", error);
    }
}

initDB();
