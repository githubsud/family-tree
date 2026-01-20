"use client";

import { FamilyMember } from "@/lib/types";
import { addChild, deleteMember, addSpouse, updateMember } from "@/lib/treeService";
import { useState, useEffect } from "react";

// Autocomplete Data
const COUNTRIES_AND_CITIES: Record<string, string[]> = {
    "السودان": ["الخرطوم", "أم درمان", "الخرطوم بحري", "مدني", "بورتسودان", "كسلا", "القضارف", "الأبيض", "عطبرة", "كورتي", "كريمة", "دنقلا", "مروي", "نيالا", "الفاشر", "الجنينة", "كوستي", "سنار"],
    "السعودية": ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "تبوك", "بريدة", "حائل", "أبها", "الطائف", "جازان", "نجران"],
    "قطر": ["الدوحة", "الريان", "الوكرة", "الخور", "أم صلال"],
    "الإمارات": ["دبي", "أبوظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة", "أم القيوين"],
    "سلطنة عمان": ["مسقط", "صواري", "صلالة", "بركاء", "نزوى", "صحار"],
    "مصر": ["القاهرة", "الإسكندرية", "الجيزة", "أكتوبر", "الشيخ زايد", "المنصورة", "أسوان", "الأقصر", "شرم الشيخ", "الغردقة"],
    "البحرين": ["المنامة", "المحرق", "الرفاع"],
    "الكويت": ["الكويت", "حولي", "السالمية", "الأحمدي"],
    "أمريكا": ["New York", "Washington DC", "Virginia", "California", "Texas", "Chicago", "Boston", "Seattle", "Florida"],
    "بريطانيا": ["London", "Manchester", "Liverpool", "Birmingham", "Edinburgh", "Glasgow"],
    "كندا": ["Toronto", "Ottawa", "Montreal", "Vancouver", "Calgary"],
    "ألمانيا": ["Berlin", "Munich", "Frankfurt", "Hamburg", "Stuttgart"],
    "أيرلندا": ["Dublin", "Cork", "Galway"],
};

const COMMON_OCCUPATIONS = [
    "مهندس", "مهندس برمجيات", "مهندس مدني", "مهندس معماري", "مهندس كهرباء", "مهندس ميكانيكا", "مهندس زراعي",
    "طبيب", "طبيب أسنان", "طبيب عام", "جراح", "صيدلي", "ممرض", "فني مختبر",
    "معلم", "أستاذ جامعي", "محاضر", "مدير مدرسة", "وكيل مدرسة",
    "محاسب", "مدقق مالي", "مدير مالي", "محلل مالي",
    "رائد أعمال", "رجل أعمال", "مدير مشاريع", "مدير تنفيذي", "مدير موارد بشرية", "مدير تسويق",
    "مبرمج", "مصمم جرافيك", "كاتب", "صحفي", "إعلامي", "مترجم",
    "محامي", "قاضي", "ضابط", "طيار", "مضيف طيران",
    "موظف حكومي", "دبلوماسي", "سفير",
    "طالب", "متقاعد", "ربة منزل", "عمل حر"
];

interface Props {
    members: FamilyMember[];
    rootId: string;
    isOwner: boolean;
    reload: () => void;
}

type LayoutMode = 'bottom-up' | 'top-down' | 'horizontal';
type NodeStyle = 'cards' | 'rectangles' | 'text';

// Recursive Node Component
const TreeNode = ({
    member,
    allMembers,
    isOwner,
    reload,
    layoutMode,
    nodeStyle,
    level = 0,
    isFirst = false,
    isLast = false,
    expandedIds,
    activeCardId,
    onToggle,
    onExpand,
    onCardTap
}: {
    member: FamilyMember,
    allMembers: FamilyMember[],
    isOwner: boolean,
    reload: () => void,
    layoutMode: LayoutMode,
    nodeStyle: NodeStyle,
    level?: number,
    isFirst?: boolean,
    isLast?: boolean,
    expandedIds: Set<string>,
    activeCardId: string | null,
    onToggle: (id: string) => void,
    onExpand: (id: string) => void,
    onCardTap: (id: string) => void
}) => {
    // Hierarchical Logic:
    // 1. If Member is NOT spouse: Visual Children = Spouses
    // 2. If Member IS spouse: Visual Children = Their Own Children

    // Original logical children (Direct descendants)
    // const directChildren = allMembers.filter(m => m.parentId === member.id);

    // Spouses (Partners)
    const spouses = allMembers.filter(m => m.spouseOf === member.id && m.isSpouse);

    // Own Children (for Spouses)
    const ownChildren = allMembers.filter(m => m.parentId === member.id);

    let visualChildren: FamilyMember[] = [];
    if (member.isSpouse) {
        // If Spouse: Show Own Children + (If First Spouse) Husband's "Orphan" Children
        const husbandId = member.spouseOf;
        const husbandChildren = husbandId
            ? allMembers.filter(m => m.parentId === husbandId)
            : [];

        // If I am the First Spouse, inherit husband's children (Legacy Data)
        if (isFirst && husbandChildren.length > 0) {
            const combined = [...ownChildren, ...husbandChildren.filter(hc => !ownChildren.some(oc => oc.id === hc.id))];
            visualChildren = combined;
        } else {
            visualChildren = ownChildren;
        }
    } else {
        // For regular members:
        // 1. Spouses are the "Next Level"
        // 2. FALLBACK: If no spouses, show direct children (Legacy Data Support)
        const directChildren = allMembers.filter(m => m.parentId === member.id);
        visualChildren = spouses.length > 0 ? spouses : directChildren;
    }

    // Sort Children by Age (Oldest First -> Right in RTL)
    // Custom Order takes precedence
    visualChildren.sort((a, b) => {
        // 1. Custom Order
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1; // Specific order comes first
        if (b.order !== undefined) return 1;

        // 2. Birth Date (Oldest First)
        if (!a.birthDate) return 1; // No date -> End
        if (!b.birthDate) return -1;
        return new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime();
    });

    const hasChildren = visualChildren.length > 0;

    // Collapsed state
    // Collapsed state derived from props
    // If ID is in set, it is expanded. If not, it is collapsed.
    const isExpanded = expandedIds.has(member.id);
    const isCollapsed = !isExpanded;

    // Add child state
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingId, setEditingId] = useState("");
    const [editName, setEditName] = useState("");
    const [editOrder, setEditOrder] = useState<number | "">("");

    // Advanced Profile State
    const [editIsDeceased, setEditIsDeceased] = useState(false);
    const [editSpouseStatus, setEditSpouseStatus] = useState<'current' | 'former'>('current');
    const [editCountry, setEditCountry] = useState("");
    const [editCity, setEditCity] = useState("");
    const [editOccupation, setEditOccupation] = useState("");
    const [editOccupationStatus, setEditOccupationStatus] = useState<'student' | 'working' | 'unemployed' | 'retired' | ''>('');
    const [editHobbies, setEditHobbies] = useState("");
    const [editBio, setEditBio] = useState("");

    const [newChildName, setNewChildName] = useState("");
    const [newChildGender, setNewChildGender] = useState<'male' | 'female'>('male');
    const [isAddingSpouse, setIsAddingSpouse] = useState(false);
    const [targetId, setTargetId] = useState<string>(member.id); // Default to member, but can be spouseId

    const handleUpdateMember = async () => {
        if (!editName || !editingId) return;
        const updates: any = {
            name: editName,
            isDeceased: editIsDeceased,
            spouseStatus: editSpouseStatus,
            location: { country: editCountry, city: editCity },
            occupation: { title: editOccupation, status: editOccupationStatus },
            hobbies: editHobbies ? editHobbies.split(',').map(s => s.trim()) : [],
            bio: editBio
        };
        if (editOrder !== "") updates.order = Number(editOrder);
        // else updates.order = undefined; // REMOVED: Firestore throws on undefined. To clear, we need deleteField() or allow null. For now, preventing crash is priority.

        await updateMember(editingId, updates);
        setShowEdit(false);
        setEditingId("");
        setEditName("");
        setEditOrder("");
        reload();
    };

    const handleAddChild = async (targetId: string, isSpouseChild: boolean = false) => {
        if (!newChildName) return;

        // If adding to spouse, targetId is spouseId. 
        // But wait, usually in this tree children link to Father (Member). 
        // If user wants "attached to spouse", maybe we link to Spouse? 
        // Let's link to the ID passed (targetId).
        await addChild(targetId, { name: newChildName, gender: newChildGender, treeId: member.treeId });

        setShowAdd(false);
        setNewChildName("");
        reload();
        onExpand(member.id);
    };

    const handleAddSpouse = async () => {
        // if (!newChildName) return; // Allow empty spouse name
        // Gender is opposite of member
        const spouseGender = member.gender === 'male' ? 'female' : 'male';

        // Import addSpouse first! I will need to add import to top of file also.
        // auto-import logic or just standard call if imported.
        await addSpouse(member.id, { name: newChildName, gender: spouseGender, treeId: member.treeId });
        setShowAdd(false);
        setNewChildName("");
        reload();
    };

    const handleDelete = async () => {
        if (confirm(`هل أنت متأكد من حذف ${member.name}؟ سيؤدي هذا لحذف الفرع بالكامل!`)) {
            await deleteMember(member.id);
            reload();
        }
    };

    // --- Dynamic Styles based on Preferences ---

    // Layout Classes
    const isHorizontal = layoutMode === 'horizontal';
    const isBottomUp = layoutMode === 'bottom-up';

    // We use padding instead of margin to allow connector lines to span the gap
    let containerClass = "flex items-stretch relative ";
    if (isHorizontal) containerClass += "flex-row";
    else if (isBottomUp) containerClass += "flex-col-reverse"; // Removed gap-8 to fix connector gaps
    else containerClass += "flex-col"; // Removed gap-8 to fix connector gaps

    // Node Styling
    const renderNodeContent = () => {
        // Special Compact Style for Spouses
        if (member.isSpouse) {
            let spouseLabel = member.gender === 'male' ? 'الزوج' : 'الزوجة';
            if (member.spouseStatus === 'former') spouseLabel += ' سابقاً'; // Append former status
            spouseLabel += ':';

            return (
                <div
                    className={`
                    flex flex-row items-center justify-center gap-1 px-3 py-1.5 rounded-lg border-2 shadow-sm
                    ${member.isDeceased ? 'bg-gray-100 border-gray-400 grayscale' : 'bg-white border-purple-300 bg-purple-50'}
                    min-w-fit whitespace-nowrap relative group cursor-pointer
                `}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCardTap(member.id);
                    }}
                >
                    {/* Death Indicator */}
                    {member.isDeceased && (
                        <div className="absolute top-0 left-0 w-4 h-4 overflow-hidden rounded-tl-lg">
                            <div className="absolute top-[-2px] left-[-6px] w-[20px] h-[4px] bg-black transform -rotate-45"></div>
                        </div>
                    )}

                    <span className="text-[10px] text-gray-500">{spouseLabel}</span>
                    <span className="font-bold text-center text-xs leading-tight">{member.name || 'لا يوجد الإسم'}</span>

                    {/* Hover Detail Card */}
                    <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white text-[10px] p-2 rounded hidden group-hover:block z-50 pointer-events-none shadow-xl text-center
                    ${activeCardId === member.id ? '!block !z-[101]' : ''}
                `}>
                        {member.location?.country && <div>📍 {member.location.country}{member.location.city ? `, ${member.location.city}` : ''}</div>}
                        {member.occupation?.title && <div>💼 {member.occupation.title} {member.occupation.status ? `(${member.occupation.status === 'working' ? 'يعمل' : member.occupation.status === 'retired' ? 'متقاعد' : member.occupation.status === 'student' ? 'طالب' : 'يبحث عن عمل'})` : ''}</div>}
                        {member.hobbies && member.hobbies.length > 0 && <div>🎨 {member.hobbies.join(', ')}</div>}
                        {member.bio && <div className="mt-1 italic border-t border-gray-600 pt-1">"{member.bio}"</div>}
                        {(!member.location?.country && !member.occupation?.title && !member.bio) && <div className="opacity-50">لا توجد تفاصيل إضافية</div>}
                    </div>
                </div>
            );
        }

        const isMale = member.gender === 'male';
        const baseColor = isMale ? "bg-yellow-50 border-yellow-400" : "bg-pink-50 border-pink-400";
        const icon = isMale ? '👳🏼' : '🧕🏼';

        if (nodeStyle === 'text') {
            return (
                <div
                    className={`p-1 px-3 rounded border text-sm font-bold bg-white text-gray-900 group relative cursor-pointer
                ${member.isDeceased ? 'border-gray-400 bg-gray-100 grayscale' : baseColor}
                `}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCardTap(member.id);
                    }}
                >
                    {/* Death Indicator */}
                    {member.isDeceased && (
                        <div className="absolute top-[-2px] left-[-2px] w-3 h-3 z-20">
                            <div className="absolute top-[2px] left-[-1px] w-[12px] h-[2px] bg-black transform -rotate-45"></div>
                        </div>
                    )}
                    {member.name}

                    {/* Hover Detail Card */}
                    <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white text-[10px] p-2 rounded hidden group-hover:block z-[100] pointer-events-none shadow-xl text-center
                    ${activeCardId === member.id ? '!block !z-[101]' : ''}
                `}>
                        {member.location?.country && <div>📍 {member.location.country}{member.location.city ? `, ${member.location.city}` : ''}</div>}
                        {member.occupation?.title && <div>💼 {member.occupation.title} {member.occupation.status ? `(${member.occupation.status === 'working' ? 'يعمل' : member.occupation.status === 'retired' ? 'متقاعد' : member.occupation.status === 'student' ? 'طالب' : 'يبحث عن عمل'})` : ''}</div>}
                        {member.hobbies && member.hobbies.length > 0 && <div>🎨 {member.hobbies.join(', ')}</div>}
                        {member.bio && <div className="mt-1 italic border-t border-gray-600 pt-1">"{member.bio}"</div>}
                        {(!member.location?.country && !member.occupation?.title && !member.bio) && <div className="opacity-50">لا توجد تفاصيل إضافية</div>}
                    </div>
                </div>
            );
        }

        if (nodeStyle === 'rectangles') {
            return (
                <div
                    className={`
                    p-2 w-32 border-2 rounded shadow-sm text-center relative group
                    transition-transform hover:scale-105 active:scale-95 bg-white cursor-pointer
                    ${member.isDeceased ? 'border-gray-400 bg-gray-100 grayscale' : baseColor} text-gray-900
                `}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCardTap(member.id);
                    }}
                >
                    {/* Death Indicator */}
                    {member.isDeceased && (
                        <div className="absolute top-0 left-0 w-4 h-4 overflow-hidden rounded-tl">
                            <div className="absolute top-[-2px] left-[-6px] w-[20px] h-[4px] bg-black transform -rotate-45"></div>
                        </div>
                    )}

                    <div className="font-bold text-sm truncate">{member.name}</div>

                    {/* Hover Detail Card */}
                    <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white text-[10px] p-2 rounded hidden group-hover:block z-[100] pointer-events-none shadow-xl text-center
                    ${activeCardId === member.id ? '!block !z-[101]' : ''}
                `}>
                        {member.location?.country && <div>📍 {member.location.country}{member.location.city ? `, ${member.location.city}` : ''}</div>}
                        {member.occupation?.title && <div>💼 {member.occupation.title} {member.occupation.status ? `(${member.occupation.status === 'working' ? 'يعمل' : member.occupation.status === 'retired' ? 'متقاعد' : member.occupation.status === 'student' ? 'طالب' : 'يبحث عن عمل'})` : ''}</div>}
                        {member.hobbies && member.hobbies.length > 0 && <div>🎨 {member.hobbies.join(', ')}</div>}
                        {member.bio && <div className="mt-1 italic border-t border-gray-600 pt-1">"{member.bio}"</div>}
                        {(!member.location?.country && !member.occupation?.title && !member.bio) && <div className="opacity-50">لا توجد تفاصيل إضافية</div>}
                    </div>
                </div>
            );
        }

        // Default 'cards'
        return (
            <div
                className={`
                    flex flex-col items-center justify-center p-2 rounded-full border-4 shadow-lg w-20 h-20 sm:w-24 sm:h-24 
                    transition-transform hover:scale-110 active:scale-95 bg-white relative group
                    ${member.isDeceased ? 'border-gray-400 bg-gray-100 grayscale' : baseColor} 
                    print:border-2 print:shadow-none text-gray-900 cursor-pointer
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    onCardTap(member.id);
                }}
            >
                {/* Death Indicator */}
                {member.isDeceased && (
                    <div className="absolute top-2 left-1 w-6 h-6 z-20">
                        <div className="absolute top-1 left-[-2px] w-[24px] h-[4px] bg-black transform -rotate-45"></div>
                    </div>
                )}

                <span className="text-2xl sm:text-3xl mb-1">{icon}</span>
                <span className="font-bold text-center text-[10px] sm:text-xs line-clamp-2 leading-tight">{member.name}</span>

                {/* Hover Detail Card */}
                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white text-[10px] p-2 rounded hidden group-hover:block z-50 pointer-events-none shadow-xl text-center
                    ${activeCardId === member.id ? '!block !z-[101]' : ''}
                `}>
                    {member.location?.country && <div>📍 {member.location.country}{member.location.city ? `, ${member.location.city}` : ''}</div>}
                    {member.occupation?.title && <div>💼 {member.occupation.title} {member.occupation.status ? `(${member.occupation.status === 'working' ? 'يعمل' : member.occupation.status === 'retired' ? 'متقاعد' : member.occupation.status === 'student' ? 'طالب' : 'يبحث عن عمل'})` : ''}</div>}
                    {member.hobbies && member.hobbies.length > 0 && <div>🎨 {member.hobbies.join(', ')}</div>}
                    {member.bio && <div className="mt-1 italic border-t border-gray-600 pt-1">"{member.bio}"</div>}
                    {(!member.location?.country && !member.occupation?.title && !member.bio) && <div className="opacity-50">لا توجد تفاصيل إضافية</div>}
                </div>
            </div>
        );
    };

    // Connector Helper
    const connectorColor = "bg-gray-300 dark:bg-gray-500 print:bg-black"; // Match grid color
    const busColor = "bg-gray-300 dark:bg-gray-500 print:bg-black";
    const thickness = "2px"; // Uniform thickness

    // Helper Styles
    const lineStyle = { backgroundColor: 'rgb(209 213 219)', width: thickness }; // gray-300
    const busStyle = { backgroundColor: 'rgb(209 213 219)', width: thickness };
    const verticalLineStyle = { backgroundColor: 'rgb(209 213 219)', width: thickness };
    const horizontalLineStyle = { backgroundColor: 'rgb(209 213 219)', height: thickness };

    // Using simple class names with arbitrary values for thickness 2px
    const wThick = "w-[2px]";
    const hThick = "h-[2px]";
    const borderThick = "border-[2px]";
    const borderColor = "border-gray-300 dark:border-gray-500";
    const bgColor = "bg-gray-300 dark:bg-gray-500";

    // Smart Connector Logic
    const renderIncomingConnector = () => {
        if (level === 0) return null; // Root has no incoming connector

        // Determine spacing based on relationship type
        // Spouses are physically close (compact). Children are spaced out (structure).
        const connectorLength = member.isSpouse ? 'w-2 h-2' : 'w-8 h-8';
        const stemLength = member.isSpouse ? 'w-2' : 'w-8';
        const stemHeight = member.isSpouse ? 'h-2' : 'h-8';

        if (isHorizontal) {
            // Horizontal Mode: RTL (Parent Right)
            // Bus at Right Edge (0). Stem goes Left to Node.
            return (
                <div className={`flex items-center justify-center ${stemLength} relative shrink-0`}>
                    {/* Vertical Bus at Right Edge */}
                    {!isFirst && <div className={`absolute top-0 right-[-1px] ${wThick} h-[50%] ${bgColor}`}></div>} {/* Top Overlap */}
                    {!isLast && <div className={`absolute bottom-0 right-[-1px] ${wThick} h-[50%] ${bgColor}`}></div>} {/* Bottom Overlap */}

                    {/* Horizontal Stem (Right to Left) */}
                    <div className={`w-full ${hThick} ${bgColor}`}></div>
                </div>
            );
        } else {
            // Vertical Mode (Top-Down or Bottom-Up)
            const isTop = !isBottomUp; // Standard Top-Down

            return (
                <div className={`flex w-full ${stemHeight} relative shrink-0`}>
                    {/* Horizontal Bus Segments */}
                    {/* Left Segment */}
                    {!isLast && <div className={`absolute left-0 w-[50%] ${isTop ? 'top-0' : 'bottom-0'} ${hThick} ${bgColor}`}></div>}
                    {/* Right Segment */}
                    {!isFirst && <div className={`absolute right-0 w-[50%] ${isTop ? 'top-0' : 'bottom-0'} ${hThick} ${bgColor}`}></div>}

                    {/* Vertical Stem (Center) */}
                    <div className={`absolute left-1/2 -translate-x-1/2 ${wThick} h-full ${bgColor}`}></div>
                </div>
            );
        }
    };

    return (
        <div className={containerClass}>

            {/* Incoming Connector (Connects to Parent Spine) */}
            {/* For Top-Down, connector is BEFORE node. */}
            {/* Incoming Connector (Connects to Parent Spine) */}
            {/* Render primarily at start. In Bottom-Up (flex-col-reverse), this becomes Visual Bottom. */}
            {!isHorizontal && renderIncomingConnector()}

            {/* For Horizontal, connector is BEFORE node (if RTL, parent is right, so connector is right) */}
            {isHorizontal && renderIncomingConnector()}

            {/* 1. NODE ITSELF */}
            <div className={`relative group z-10 hover:z-[100] ${isHorizontal ? 'py-6 px-2 pr-0' : (isBottomUp ? 'px-2 pt-2 pb-0' : 'px-2 pb-2 pt-0')} flex justify-center items-center`}>
                <div className="flex gap-4 items-start">
                    {/* Main Member Node - Order 2 (Center) */}
                    <div className="relative group order-2">
                        {renderNodeContent()}

                        {/* Collapse Toggle */}
                        {hasChildren && (
                            <button
                                onClick={() => onToggle(member.id)}
                                className={`
                                    absolute w-5 h-5 rounded-full z-20 
                                    bg-white border text-xs flex items-center justify-center shadow hover:bg-gray-100 cursor-pointer
                                    ${isHorizontal
                                        ? 'top-1/2 -left-3 -translate-y-1/2'
                                        : isBottomUp
                                            ? '-top-3 left-1/2 -translate-x-1/2'
                                            : '-bottom-3 left-1/2 -translate-x-1/2'
                                    }
                                `}
                            >
                                {isCollapsed ? '+' : '-'}
                            </button>
                        )}

                        {/* Add/Edit Controls */}
                        {isOwner && (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden flex flex-col gap-1">
                                {/* Member Child Addition Removed - Only via Spouse */}
                                {/* <button onClick={() => { setShowAdd(true); setIsAddingSpouse(false); setTargetId(member.id); }} className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="إضافة ابن">+</button> */}
                                {/* Member Nodes: Can Add Spouse (Heart), Cannot Add Child (+) */}
                                {!member.isRoot && <button onClick={handleDelete} className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="حذف">x</button>}
                                {!member.isSpouse && <button onClick={() => { setShowAdd(true); setIsAddingSpouse(true); }} className="bg-purple-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="إضافة زوج/زوجة">♥</button>}
                                {member.isSpouse && <button onClick={() => { setShowAdd(true); setIsAddingSpouse(false); setTargetId(member.id); }} className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="إضافة ابن">+</button>}
                                <button onClick={() => {
                                    setEditingId(member.id);
                                    setEditName(member.name);
                                    setEditOrder(member.order || "");

                                    // Init Advanced Fields
                                    setEditIsDeceased(member.isDeceased || false);
                                    setEditSpouseStatus(member.spouseStatus || 'current');
                                    setEditCountry(member.location?.country || "");
                                    setEditCity(member.location?.city || "");
                                    setEditOccupation(member.occupation?.title || "");
                                    setEditOccupationStatus(member.occupation?.status || "");
                                    setEditHobbies(member.hobbies?.join(', ') || "");
                                    setEditBio(member.bio || "");

                                    setShowEdit(true);
                                }} className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="تعديل">✎</button>
                            </div>
                        )}

                        {/* Edit Popup */}
                        {showEdit && (
                            <div className="absolute top-full mt-2 bg-white p-4 rounded-lg shadow-2xl border w-80 z-[100] print:hidden text-right max-h-[80vh] overflow-y-auto">
                                <h4 className="text-sm font-bold mb-3 text-center text-gray-800 border-b pb-2">تفاصيل العضو</h4>

                                {/* Basic Info */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">الاسم</label>
                                        <input className="border p-1.5 w-full text-sm rounded bg-gray-50 focus:bg-white transition-colors" placeholder="الاسم" value={editName} onChange={e => setEditName(e.target.value)} />
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-500 block mb-1">الترتيب</label>
                                            <input type="number" className="border p-1.5 w-full text-sm rounded bg-gray-50" placeholder="0" value={editOrder} onChange={e => setEditOrder(e.target.value === "" ? "" : Number(e.target.value))} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-500 block mb-1">الحالة</label>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input type="checkbox" checked={editIsDeceased} onChange={e => setEditIsDeceased(e.target.checked)} className="w-4 h-4" />
                                                <span className="text-xs">متوفي</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Spouse Status (Only if isSpouse or has spouse logic? User said "For spouse") */}
                                    {member.isSpouse && (
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">حالة الزواج</label>
                                            <select className="border p-1.5 w-full text-sm rounded bg-gray-50" value={editSpouseStatus} onChange={(e: any) => setEditSpouseStatus(e.target.value)}>
                                                <option value="current">حالياً (الزوج/الزوجة)</option>
                                                <option value="former">سابقاً (طليق/أرمل)</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Location */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">
                                                {editIsDeceased ? 'الدولة (مكان الوفاة/السكن)' : 'دولة الإقامة حالياً'}
                                            </label>
                                            <input list="countries" className="border p-1.5 w-full text-sm rounded bg-gray-50 text-right" placeholder={editIsDeceased ? 'الدولة' : 'دولة الإقامة'} value={editCountry} onChange={e => setEditCountry(e.target.value)} />
                                            <datalist id="countries">
                                                {Object.keys(COUNTRIES_AND_CITIES).map(country => (
                                                    <option key={country} value={country} />
                                                ))}
                                                <option value="أخرى" />
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">المدينة</label>
                                            <input list="cities" className="border p-1.5 w-full text-sm rounded bg-gray-50 text-right" placeholder="المدينة" value={editCity} onChange={e => setEditCity(e.target.value)} />
                                            <datalist id="cities">
                                                {(COUNTRIES_AND_CITIES[editCountry] || []).map(city => (
                                                    <option key={city} value={city} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    {/* Occupation */}
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">العمل</label>
                                        <div className="flex gap-2 mb-1">
                                            <select className="border p-1.5 w-1/3 text-xs rounded bg-gray-50 text-right" value={editOccupationStatus} onChange={(e: any) => setEditOccupationStatus(e.target.value)}>
                                                <option value="">-</option>
                                                <option value="working">يعمل</option>
                                                <option value="student">طالب</option>
                                                <option value="unemployed">يبحث عن عمل</option>
                                                <option value="retired">متقاعد</option>
                                            </select>
                                            <input list="jobs" className="border p-1.5 w-2/3 text-sm rounded bg-gray-50 text-right" placeholder="المسمى الوظيفي" value={editOccupation} onChange={e => setEditOccupation(e.target.value)} />
                                            <datalist id="jobs">
                                                {COMMON_OCCUPATIONS.map(job => (
                                                    <option key={job} value={job} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    {/* Extra */}
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">الهوايات</label>
                                        <input className="border p-1.5 w-full text-sm rounded bg-gray-50 text-right" placeholder="مثال: القراءة، السباحة" value={editHobbies} onChange={e => setEditHobbies(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">نبذة (About Me)</label>
                                        <textarea className="border p-1.5 w-full text-sm rounded bg-gray-50 h-16 text-right" placeholder="اكتب شيئاً مختصراً..." value={editBio} onChange={e => setEditBio(e.target.value)} />
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t flex flex-col gap-2">
                                    <button onClick={handleUpdateMember} className="bg-blue-600 text-white w-full text-sm py-2 rounded-md hover:bg-blue-700 shadow-sm transition-colors">حفظ التعديلات</button>
                                    <button onClick={() => setShowEdit(false)} className="bg-gray-100 text-gray-600 w-full text-xs py-2 rounded-md hover:bg-gray-200 transition-colors">إلغاء</button>
                                </div>
                            </div>
                        )}

                        {/* Add Popup */}
                        {showAdd && (
                            <div className="absolute top-full mt-2 bg-white p-3 rounded shadow-xl border w-48 z-[100] print:hidden">
                                <h4 className="text-xs font-bold mb-2 text-center text-gray-700">
                                    {isAddingSpouse ? (member.gender === 'male' ? 'إضافة زوجة' : 'إضافة زوج') : 'إضافة ابن/ابنة'}
                                </h4>
                                <input className="border p-1 w-full text-sm mb-2 rounded text-right" placeholder="الاسم" autoFocus value={newChildName} onChange={e => setNewChildName(e.target.value)} />

                                {!isAddingSpouse && (
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={() => setNewChildGender('male')} className={`flex-1 text-xs py-1 rounded ${newChildGender === 'male' ? 'bg-yellow-200 ring-2 ring-yellow-500' : 'bg-gray-100'}`}>ذكر</button>
                                        <button onClick={() => setNewChildGender('female')} className={`flex-1 text-xs py-1 rounded ${newChildGender === 'female' ? 'bg-pink-200 ring-2 ring-pink-500' : 'bg-gray-100'}`}>أنثى</button>
                                    </div>
                                )}

                                <button onClick={() => isAddingSpouse ? handleAddSpouse() : handleAddChild(targetId)} className="bg-blue-600 text-white w-full text-xs py-1.5 rounded hover:bg-blue-700">حفظ</button>
                            </div>
                        )}
                    </div>

                    {/* Spouses Render */}
                    {/* Split Spouses: Left & Right */}
                    {(() => {
                        return null; // Refactor: Spouses moved to child level (Level N+1)
                        const rightSpouses = spouses.filter((_, i) => i % 2 === 0);
                        const leftSpouses = spouses.filter((_, i) => i % 2 !== 0);

                        const renderSpouseNode = (spouse: FamilyMember, orderClass: string) => {
                            const spouseLabel = member.gender === 'male' ? 'الزوجة:' : 'الزوج:';
                            return (
                                <div key={spouse.id} className={`relative group flex flex-col items-center ${orderClass}`}>
                                    {/* Compact Single Line Box */}
                                    <div className={`
                                        flex flex-row items-center justify-center gap-1 px-3 py-1.5 rounded-lg border-2 shadow-sm
                                        bg-white ${member.gender === 'male' ? 'border-pink-300 bg-pink-50' : 'border-yellow-300 bg-yellow-50'}
                                        min-w-fit whitespace-nowrap relative group (Wait this is legacy block)
                                    `}>
                                        <span className="text-[10px] text-gray-500">{spouseLabel}</span>
                                        <span className="font-bold text-center text-xs leading-tight">{spouse.name || 'بدون اسم'}</span>

                                        {/* Add Child to Spouse Button */}
                                        {isOwner && (
                                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden flex flex-col gap-1">
                                                <button onClick={() => {
                                                    setShowAdd(true);
                                                    setIsAddingSpouse(false);
                                                    setTargetId(spouse.id);
                                                }} className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="إضافة ابن للزوجة">+</button>
                                                {/* Edit Spouse */}
                                                <button onClick={() => {
                                                    setEditingId(spouse.id);
                                                    setEditName(spouse.name || '');
                                                    setShowEdit(true);
                                                }} className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="تعديل">✎</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <>
                                {/* Left Spouses - Order 1 */}
                                {leftSpouses.length > 0 && (
                                    <div className="flex gap-4 order-1">
                                        {leftSpouses.map(s => renderSpouseNode(s, ""))}
                                    </div>
                                )}

                                {/* Right Spouses - Order 3 */}
                                {rightSpouses.length > 0 && (
                                    <div className="flex gap-4 order-3">
                                        {rightSpouses.map(s => renderSpouseNode(s, ""))}
                                    </div>
                                )}
                            </>
                        );
                    })()}

                </div>
            </div>

            {/* For Bottom-Up, Incoming Connector is handled at the start via flex-col-reverse */}

            {/* 2. CONNECTIONS & CHILDREN */}
            {!isCollapsed && hasChildren && (
                <>
                    {/* The "Spine" leaving the node towards children's bus (Removed for consistency) */}

                    {/* Children Container - remove borders! */}
                    <div className={isHorizontal
                        ? "flex flex-col justify-center" // No borders
                        : `flex justify-center ${isBottomUp ? 'items-end' : 'items-start'}`
                    }>

                        {/* 1. Direct Children of Member */}
                        {/* 1. Visual Children (Either Spouses OR Children depending on level) */}
                        {visualChildren.length > 0 && (
                            <div className={`flex justify-center ${isHorizontal ? 'flex-col' : 'flex-row'}`}>
                                {visualChildren.map((child, idx) => (
                                    <TreeNode
                                        key={child.id}
                                        member={child}
                                        allMembers={allMembers}
                                        isOwner={isOwner}
                                        reload={reload}
                                        layoutMode={layoutMode}
                                        nodeStyle={nodeStyle}
                                        level={level + 1}
                                        isFirst={idx === 0}
                                        isLast={idx === visualChildren.length - 1}
                                        expandedIds={expandedIds}
                                        activeCardId={activeCardId}
                                        onToggle={onToggle}
                                        onExpand={onExpand}
                                        onCardTap={onCardTap}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default function TreeVisualizer({ members, rootId, isOwner, reload }: Props) {
    // --- State for Preferences ---
    // --- State for Preferences ---
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal');
    const [nodeStyle, setNodeStyle] = useState<NodeStyle>('text');

    // --- State for Expansion (Persisted) ---
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([rootId]));
    const [activeCardId, setActiveCardId] = useState<string | null>(null);

    // Load preferences & expansion on mount
    useEffect(() => {
        const savedLayout = localStorage.getItem('tree_layout') as LayoutMode;
        const savedStyle = localStorage.getItem('tree_style') as NodeStyle;
        const savedExpanded = localStorage.getItem(`tree_expanded_${rootId}`);

        if (savedLayout) setLayoutMode(savedLayout);
        if (savedStyle) setNodeStyle(savedStyle);
        if (savedExpanded) {
            try {
                setExpandedIds(new Set(JSON.parse(savedExpanded)));
            } catch (e) {
                console.error("Failed to parse expanded state", e);
            }
        }
    }, [rootId]);

    // Handlers
    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
        localStorage.setItem(`tree_expanded_${rootId}`, JSON.stringify(Array.from(newSet)));
    };

    const expandNode = (id: string) => {
        if (expandedIds.has(id)) return;
        const newSet = new Set(expandedIds);
        newSet.add(id);
        setExpandedIds(newSet);
        localStorage.setItem(`tree_expanded_${rootId}`, JSON.stringify(Array.from(newSet)));
    };

    // Save preferences
    const handleLayoutChange = (mode: LayoutMode) => {
        setLayoutMode(mode);
        localStorage.setItem('tree_layout', mode);
    };
    const handleStyleChange = (style: NodeStyle) => {
        setNodeStyle(style);
        localStorage.setItem('tree_style', style);
    };

    // --- Render ---
    const rootMember = members.find(m => m.id === rootId);

    if (!rootMember) return <div>لا يوجد بيانات جذر</div>;

    return (
        <div className="flex flex-col w-full h-full">

            {/* Control Panel (Floating or Top) */}
            <div className="flex flex-wrap gap-4 p-4 bg-white/90 backdrop-blur shadow-md rounded-lg mb-8 mx-auto z-40 print:hidden justify-center text-sm border border-purple-100">

                {/* Layout Controls */}
                <div className="flex flex-col gap-1 items-center">
                    <span className="text-xs font-bold text-gray-500">التخطيط</span>
                    <div className="flex bg-gray-100 rounded p-1">
                        <button onClick={() => handleLayoutChange('bottom-up')} className={`px-3 py-1 rounded ${layoutMode === 'bottom-up' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}>من الأسفل</button>
                        <button onClick={() => handleLayoutChange('top-down')} className={`px-3 py-1 rounded ${layoutMode === 'top-down' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}>من الأعلى</button>
                        <button onClick={() => handleLayoutChange('horizontal')} className={`px-3 py-1 rounded ${layoutMode === 'horizontal' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}>أفقي</button>
                    </div>
                </div>

                <div className="w-px bg-gray-300 mx-2"></div>

                {/* Style Controls */}
                <div className="flex flex-col gap-1 items-center">
                    <span className="text-xs font-bold text-gray-500">شكل العقدة</span>
                    <div className="flex bg-gray-100 rounded p-1">
                        <button onClick={() => handleStyleChange('cards')} className={`px-3 py-1 rounded ${nodeStyle === 'cards' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}>بطاقات</button>
                        <button onClick={() => handleStyleChange('rectangles')} className={`px-3 py-1 rounded ${nodeStyle === 'rectangles' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}>مربعات</button>
                        <button onClick={() => handleStyleChange('text')} className={`px-3 py-1 rounded ${nodeStyle === 'text' ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600'}`}>نص</button>
                    </div>
                </div>
            </div>

            {/* Tree Container */}
            <div className="flex-1 overflow-auto p-10 flex justify-center">
                <div className="min-w-max min-h-max">
                    <TreeNode
                        member={rootMember}
                        allMembers={members}
                        isOwner={isOwner}
                        reload={reload}
                        layoutMode={layoutMode}
                        nodeStyle={nodeStyle}
                        expandedIds={expandedIds}
                        activeCardId={activeCardId}
                        onToggle={toggleExpand}
                        onExpand={expandNode}
                        onCardTap={(id) => setActiveCardId(prev => prev === id ? null : id)}
                    />
                </div>
            </div>
        </div>
    );
}
