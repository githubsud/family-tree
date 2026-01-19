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
    order?: number;               // Manual ordering (1, 2, 3...)

    // Spouse Fields
    isSpouse?: boolean;           // True if this member is a spouse attached to another member
    spouseOf?: string;            // ID of the partner they are attached to
    spouseStatus?: 'current' | 'former'; // Relationship status

    // Status & Bio
    isDeceased?: boolean;
    location?: {
        country: string;
        city: string;
    };
    occupation?: {
        title: string;
        status: 'student' | 'working' | 'unemployed' | 'retired';
    };
    hobbies?: string[];
    bio?: string;
}

export interface FamilyTree {
    id: string;
    adminId: string;
    name: string;
    rootMemberId: string | null;
    createdAt: number;
}
