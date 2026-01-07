
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

async function listTrees() {
    console.log("Initializing Firebase Admin...");

    if (!admin.apps.length) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined;

            if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
                throw new Error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in .env.local");
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        } catch (e) {
            console.error("Auth Error:", e.message);
            process.exit(1);
        }
    }

    const db = admin.firestore();

    console.log('Listing all trees in Firestore...');
    try {
        const snapshot = await db.collection('trees').get();
        if (snapshot.empty) {
            console.log('No trees found.');
            return;
        }

        snapshot.forEach(doc => {
            console.log(`ID: "${doc.id}" | Name: "${doc.data().name}"`);
        });
    } catch (error) {
        console.error('Error listing trees:', error);
    }
}

listTrees();
