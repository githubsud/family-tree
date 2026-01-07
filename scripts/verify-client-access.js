
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");
const path = require('path');
const fs = require('fs');

// 1. Load Environment Variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Initializing Client SDK with Config:");
console.log("Project ID:", firebaseConfig.projectId);
// console.log("API Key:", firebaseConfig.apiKey); // Don't log full key

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testAccess(treeId) {
    if (!treeId) {
        console.log("Please provide treeId");
        return;
    }

    console.log(`Attempting to read tree: "${treeId}"...`);
    try {
        const docRef = doc(db, "trees", treeId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            console.log("✅ SUCCESS: Document found!");
            console.log("Name:", snap.data().name);
        } else {
            console.log("❌ FAILURE: Document does not exist (exists() returned false).");
        }
    } catch (error) {
        console.error("❌ ERROR THROWN:", error.code, error.message);
    }
}

const treeId = process.argv[2];
testAccess(treeId);
