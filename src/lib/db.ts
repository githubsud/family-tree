import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface UserData {
    uid: string;
    email: string;
    role: "super_admin" | "admin";
    treeId?: string;
    createdAt: number;
}

export const getUserData = async (uid: string): Promise<UserData | null> => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserData;
    } else {
        return null;
    }
};
