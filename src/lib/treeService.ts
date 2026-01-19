import { db } from "./firebase";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    addDoc
} from "firebase/firestore";
import { FamilyMember, FamilyTree } from "./types";

// --- Tree Operations ---

export const getTree = async (treeId: string): Promise<FamilyTree | null> => {
    const docRef = doc(db, "trees", treeId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as FamilyTree) : null;
};

export const getTreeMembers = async (treeId: string): Promise<FamilyMember[]> => {
    const q = query(collection(db, "members"), where("treeId", "==", treeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => d.data() as FamilyMember);
};

// --- Member Operations ---

export const addMember = async (member: Omit<FamilyMember, "id">): Promise<string> => {
    // Use a new doc reference to get ID
    const newHeaderRef = doc(collection(db, "members"));
    const finalMember = { ...member, id: newHeaderRef.id };
    await setDoc(newHeaderRef, finalMember);
    return newHeaderRef.id;
};

export const updateMember = async (memberId: string, updates: Partial<FamilyMember>) => {
    await updateDoc(doc(db, "members", memberId), updates);
};

export const deleteMember = async (memberId: string) => {
    await deleteDoc(doc(db, "members", memberId));
};

export const createRootMember = async (treeId: string, name: string, gender: 'male' | 'female' = 'male') => {
    // 1. Create Member
    const rootData: Omit<FamilyMember, "id"> = {
        treeId,
        name,
        gender,
        childrenIds: [],
        parentId: null,
        isRoot: true
    };
    const memberId = await addMember(rootData);

    // 2. Update Tree
    await updateDoc(doc(db, "trees", treeId), {
        rootMemberId: memberId
    });

    return memberId;
};

export const addChild = async (parentId: string, childData: { name: string, gender: 'male' | 'female', treeId: string }) => {
    // 1. Create Child
    const newChild: Omit<FamilyMember, "id"> = {
        ...childData,
        parentId: parentId,
        childrenIds: []
    };
    const childId = await addMember(newChild);

    // 2. Update Parent's children list
    const parentRef = doc(db, "members", parentId);
    const parentSnap = await getDoc(parentRef);
    if (parentSnap.exists()) {
        const parent = parentSnap.data() as FamilyMember;
        const newChildren = [...(parent.childrenIds || []), childId];
        await updateDoc(parentRef, { childrenIds: newChildren });
    }

    return childId;
};

export const addSpouse = async (partnerId: string, spouseData: { name: string, gender: 'male' | 'female', treeId: string }) => {
    // 1. Create Spouse Member (Marked as isSpouse)
    const newSpouse: Omit<FamilyMember, "id"> = {
        ...spouseData,
        isSpouse: true,
        spouseOf: partnerId, // Link to partner
        parentId: null,      // Spouses don't necessarily have parents in this tree context (unless blood relative, but simpler to keep separate for now)
        childrenIds: []
    };
    const spouseId = await addMember(newSpouse);

    // 2. Update Partner (Optional: verify bidirectional link if needed, or just rely on 'spouseOf')
    // For now, we rely on the visualizer finding the spouse by 'spouseOf' or we can add to a 'spousesIds' array if we added one.
    // The visualizer currently looks for children, so maybe we should ALSO add them as a "child" of sorts?
    // NO, better to query or store ID. Let's add 'spouseId' to the partner if it's the FIRST spouse, or manage list.
    // simpler: update partner's spouseId if not set (for single spouse). For multiple, we might need an array.
    // The requirement says "one, two or many spouses".
    // So 'spouseId' in types.ts was singular "spouseId?: string | null". We might need to change that to array or just rely on 'spouseOf' query.
    // However, `getTreeMembers` fetches ALL members. We can just filter on client side: members.filter(m => m.spouseOf === partnerId).

    return spouseId;
};

// --- Import/Export ---

export const exportSubtree = async (rootId: string): Promise<any> => {
    // 1. Get member
    const memberDoc = await getDoc(doc(db, "members", rootId));
    if (!memberDoc.exists()) return null;
    const member = memberDoc.data() as FamilyMember;

    // 2. Get children
    const childrenData = [];
    if (member.childrenIds && member.childrenIds.length > 0) {
        for (const childId of member.childrenIds) {
            const childTree = await exportSubtree(childId);
            if (childTree) childrenData.push(childTree);
        }
    }

    // 3. Construct JSON (omit IDs to avoid conflicts on import, or keep them for reference but ignore on creation)
    return {
        name: member.name,
        gender: member.gender,
        children: childrenData,
        // spouse...
    };
};

export const importSubtree = async (targetTreeId: string, parentId: string, data: any) => {
    // 1. Create Member
    const newMemberData = {
        name: data.name,
        gender: data.gender,
        treeId: targetTreeId,
    };

    // Add as child to parent
    const newMemberId = await addChild(parentId, newMemberData as any);

    // 2. Process Children recursively
    if (data.children && Array.isArray(data.children)) {
        // We can't use addChild directly because it updates parent list. 
        // Better to manually create children and then link? 
        // Actually addChild loop is fine, just inefficient for huge trees.
        for (const childNode of data.children) {
            await importSubtree(targetTreeId, newMemberId, childNode);
        }
    }

    return newMemberId;
};
