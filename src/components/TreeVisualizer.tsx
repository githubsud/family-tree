"use client";

import { FamilyMember } from "@/lib/types";
import { addChild, deleteMember } from "@/lib/treeService";
import { useState, useEffect } from "react";

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
    isLast = false
}: {
    member: FamilyMember,
    allMembers: FamilyMember[],
    isOwner: boolean,
    reload: () => void,
    layoutMode: LayoutMode,
    nodeStyle: NodeStyle,
    level?: number,
    isFirst?: boolean,
    isLast?: boolean
}) => {
    const children = allMembers.filter(m => m.parentId === member.id);
    const hasChildren = children.length > 0;

    // Collapsed state
    const [isCollapsed, setIsCollapsed] = useState(level > 0);

    // Add child state
    const [showAdd, setShowAdd] = useState(false);
    const [newChildName, setNewChildName] = useState("");
    const [newChildGender, setNewChildGender] = useState<'male' | 'female'>('male');

    const handleAddChild = async () => {
        if (!newChildName) return;
        await addChild(member.id, { name: newChildName, gender: newChildGender, treeId: member.treeId });
        setShowAdd(false);
        setNewChildName("");
        reload();
        setIsCollapsed(false); // auto expand
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
    if (isHorizontal) containerClass += "flex-row"; // Removed py-2
    else if (isBottomUp) containerClass += "flex-col-reverse"; // Removed px-2
    else containerClass += "flex-col"; // Removed px-2

    // Node Styling
    const renderNodeContent = () => {
        const isMale = member.gender === 'male';
        const baseColor = isMale ? "bg-yellow-50 border-yellow-400" : "bg-pink-50 border-pink-400";
        const icon = isMale ? '👳🏼' : '🧕🏼';

        if (nodeStyle === 'text') {
            return (
                <div className={`p-1 px-3 rounded border text-sm font-bold ${baseColor} whitespace-nowrap text-gray-900`}>
                    {member.name}
                </div>
            );
        }

        if (nodeStyle === 'rectangles') {
            return (
                <div className={`
                    p-2 w-32 border-2 rounded shadow-sm text-center 
                    transition-transform hover:scale-105 active:scale-95
                    ${baseColor} text-gray-900
                `}>
                    <div className="font-bold text-sm truncate">{member.name}</div>
                </div>
            );
        }

        // Default 'cards'
        return (
            <div className={`
                flex flex-col items-center justify-center p-2 rounded-full border-4 shadow-lg w-20 h-20 sm:w-24 sm:h-24 
                transition-transform hover:scale-110 active:scale-95 bg-white
                ${baseColor} print:border-2 print:shadow-none text-gray-900
            `}>
                <span className="text-2xl sm:text-3xl mb-1">{icon}</span>
                <span className="font-bold text-center text-[10px] sm:text-xs line-clamp-2 leading-tight">{member.name}</span>
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

        if (isHorizontal) {
            // Horizontal Mode: RTL (Parent Right)
            // Bus at Right Edge (0). Stem goes Left to Node.
            return (
                <div className={`flex items-center justify-center w-8 relative shrink-0`}>
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
                <div className={`flex w-full h-8 relative shrink-0`}>
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
            <div className={`relative group z-10 p-2 flex justify-center items-center`}>
                <div className="relative group">
                    {renderNodeContent()}

                    {/* Collapse Toggle (Only if has children) */}
                    {hasChildren && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
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

                    {/* Add/Edit Controls (Hover) */}
                    {isOwner && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                            <button onClick={() => setShowAdd(!showAdd)} className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs" title="إضافة">+</button>
                            {!member.isRoot && <button onClick={handleDelete} className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow text-xs mt-1" title="حذف">x</button>}
                        </div>
                    )}

                    {/* Add Popup */}
                    {showAdd && (
                        <div className="absolute top-full mt-2 bg-white p-3 rounded shadow-xl border w-48 z-[100] print:hidden">
                            <h4 className="text-xs font-bold mb-2 text-center text-gray-700">إضافة ابن/ابنة</h4>
                            <input className="border p-1 w-full text-sm mb-2 rounded" placeholder="الاسم" autoFocus value={newChildName} onChange={e => setNewChildName(e.target.value)} />
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => setNewChildGender('male')} className={`flex-1 text-xs py-1 rounded ${newChildGender === 'male' ? 'bg-yellow-200 ring-2 ring-yellow-500' : 'bg-gray-100'}`}>ذكر</button>
                                <button onClick={() => setNewChildGender('female')} className={`flex-1 text-xs py-1 rounded ${newChildGender === 'female' ? 'bg-pink-200 ring-2 ring-pink-500' : 'bg-gray-100'}`}>أنثى</button>
                            </div>
                            <button onClick={handleAddChild} className="bg-blue-600 text-white w-full text-xs py-1.5 rounded hover:bg-blue-700">حفظ</button>
                        </div>
                    )}
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

                        {children.map((child, idx) => (
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
                                isLast={idx === children.length - 1}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default function TreeVisualizer({ members, rootId, isOwner, reload }: Props) {
    // --- State for Preferences ---
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal');
    const [nodeStyle, setNodeStyle] = useState<NodeStyle>('text');

    // Load preferences on mount
    useEffect(() => {
        const savedLayout = localStorage.getItem('tree_layout') as LayoutMode;
        const savedStyle = localStorage.getItem('tree_style') as NodeStyle;
        if (savedLayout) setLayoutMode(savedLayout);
        if (savedStyle) setNodeStyle(savedStyle);
    }, []);

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
                    />
                </div>
            </div>
        </div>
    );
}
