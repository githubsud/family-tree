
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

async function viewTree(treeId) {
    if (!treeId) {
        console.log("Usage: node scripts/view-tree-raw.js <treeId>");
        return;
    }

    if (!admin.apps.length) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : undefined;

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

    console.log(`Fetching Tree: "${treeId}"...`);
    try {
        const doc = await db.collection('trees').doc(treeId).get();
        if (!doc.exists) {
            console.log('❌ TREE NOT FOUND in Database.');
            return;
        }

        console.log('✅ Tree Found!');
        console.log(JSON.stringify(doc.data(), null, 2));

    } catch (error) {
        console.error('Error fetching tree:', error);
    }
}

// Get treeId from command line arg
const treeId = process.argv[2];
viewTree(treeId);
