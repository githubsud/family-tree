export type Gender = 'male' | 'female';

export interface FamilyMember {
    id: string;
    treeId: string;
    name: string;
    gender: Gender;
    parentId?: string | null;     // Reference to parent (father/mother depending on lineage, usually father in arab lineage)
    spouseId?: string | null;     // Reference to spouse
    childrenIds: string[];        // Array of children IDs
    birthDate?: string;
    photoUrl?: string;
    isRoot?: boolean;             // Flag for the root ancestor
}

export interface FamilyTree {
    id: string;
    adminId: string;
    name: string;
    rootMemberId: string | null;
    createdAt: number;
}
