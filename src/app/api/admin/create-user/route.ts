import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const { email, password, treeName, callerToken } = await req.json();

        if (!callerToken) {
            return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
        }

        // Verify caller is Super Admin
        const decodedToken = await adminAuth.verifyIdToken(callerToken);
        const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

        if (!callerDoc.exists || callerDoc.data()?.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized operation" }, { status: 403 });
        }

        // Create new Admin User in Firebase Auth
        const newUser = await adminAuth.createUser({
            email,
            password,
            displayName: `Admin for ${treeName}`,
        });

        // Create Tree Document
        // Using slug/ID logic - simplified for now: replace spaces with hyphens + random suffix?
        // User requested unique URL. We'll use a random treeId or based on name.
        const treeId = treeName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

        // Write to Firestore: Create User Record
        await adminDb.collection("users").doc(newUser.uid).set({
            uid: newUser.uid,
            email: newUser.email,
            role: "admin",
            treeId: treeId,
            createdAt: Date.now(),
        });

        // Write to Firestore: Create Tree Record
        await adminDb.collection("trees").doc(treeId).set({
            id: treeId,
            adminId: newUser.uid,
            name: treeName,
            rootMemberId: null, // Will be created later by Admin
            createdAt: Date.now(),
        });

        return NextResponse.json({ success: true, uid: newUser.uid, treeId });
    } catch (error: any) {
        console.error("Create User Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
