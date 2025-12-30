import { FamilyMember } from "@/lib/types";
import { addChild, deleteMember } from "@/lib/treeService";
import { useState } from "react";

interface Props {
    members: FamilyMember[];
    rootId: string;
    isOwner: boolean;
    reload: () => void;
}

// Recursive Node Component
const TreeNode = ({
    member,
    allMembers,
    isOwner,
    reload
}: {
    member: FamilyMember,
    allMembers: FamilyMember[],
    isOwner: boolean,
    reload: () => void
}) => {
    const children = allMembers.filter(m => m.parentId === member.id);
    // Sort children: older first? Or just by creation.

    const [showAdd, setShowAdd] = useState(false);
    const [newChildName, setNewChildName] = useState("");
    const [newChildGender, setNewChildGender] = useState<'male' | 'female'>('male');

    const handleAddChild = async () => {
        if (!newChildName) return;
        await addChild(member.id, { name: newChildName, gender: newChildGender, treeId: member.treeId });
        setShowAdd(false);
        setNewChildName("");
        reload();
    };

    const handleDelete = async () => {
        if (confirm(`هل أنت متأكد من حذف ${member.name}؟ سيؤدي هذا لحذف الفرع بالكامل!`)) {
            // Must implement recursive delete in service ideally, but for now just delete node.
            await deleteMember(member.id);
            reload();
        }
    };

    return (
        <div className="flex flex-col-reverse items-center mx-4">
            {/* 1. Member Card (Bottom) */}
            <div className="relative group z-10">
                <div
                    className={`
                        flex flex-col items-center justify-center p-3 rounded-lg border-2 shadow-lg w-24 h-24 sm:w-32 sm:h-32 transition-transform hover:scale-105
                        ${member.gender === 'male' ? 'bg-yellow-100 border-yellow-400' : 'bg-pink-100 border-pink-400'}
                    `}
                >
                    <span className="text-3xl sm:text-4xl mb-1">
                        {member.gender === 'male' ? '👳🏼\u200d♀️' : '🧕🏼'}
                    </span>
                    <span className="font-bold text-center text-xs sm:text-sm line-clamp-2">{member.name}</span>
                </div>

                {/* Edit Actions */}
                {isOwner && (
                    <div className="absolute top-0 -right-8 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setShowAdd(!showAdd)}
                            className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow"
                            title="إضافة ابن/ابنة"
                        >
                            +
                        </button>
                        {!member.isRoot && (
                            <button
                                onClick={handleDelete}
                                className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow"
                                title="حذف"
                            >
                                x
                            </button>
                        )}
                    </div>
                )}

                {/* Add Child Form */}
                {showAdd && (
                    <div className="absolute bottom-full mb-2 bg-white p-2 rounded shadow-xl border w-48 z-20">
                        <input
                            className="border p-1 w-full text-sm mb-1"
                            placeholder="الاسم"
                            autoFocus
                            value={newChildName}
                            onChange={e => setNewChildName(e.target.value)}
                        />
                        <div className="flex gap-2 mb-1">
                            <button
                                onClick={() => setNewChildGender('male')}
                                className={`flex-1 text-xs py-1 rounded ${newChildGender === 'male' ? 'bg-yellow-200 ring-1 ring-yellow-500' : 'bg-gray-100'}`}
                            >
                                ذكر
                            </button>
                            <button
                                onClick={() => setNewChildGender('female')}
                                className={`flex-1 text-xs py-1 rounded ${newChildGender === 'female' ? 'bg-pink-200 ring-1 ring-pink-500' : 'bg-gray-100'}`}
                            >
                                أنثى
                            </button>
                        </div>
                        <button
                            onClick={handleAddChild}
                            className="bg-blue-600 text-white w-full text-xs py-1 rounded"
                        >
                            إضافة
                        </button>

                        <div className="border-t my-2"></div>

                        <label className="block text-xs mb-1 cursor-pointer bg-gray-100 hover:bg-gray-200 text-center py-1 rounded">
                            <span>استيراد فرع Tree</span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".json"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const text = await file.text();
                                    try {
                                        const json = JSON.parse(text);
                                        const { importSubtree } = await import('@/lib/treeService');
                                        await importSubtree(member.treeId, member.id, json);
                                        reload();
                                        setShowAdd(false);
                                    } catch (err) {
                                        alert("فشل الاستيراد");
                                        console.error(err);
                                    }
                                }}
                            />
                        </label>

                        <button
                            onClick={async () => {
                                const { exportSubtree } = await import('@/lib/treeService');
                                const data = await exportSubtree(member.id);
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${member.name}_tree.json`;
                                a.click();
                            }}
                            className="w-full text-xs py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 mt-1"
                        >
                            تصدير هذا الفرع
                        </button>
                    </div>
                )}
            </div>

            {/* 2. Connection Line to Children */}
            {children.length > 0 && (
                <div className="h-8 w-px bg-gray-400 dark:bg-gray-500 my-1"></div>
            )}

            {/* 3. Children Row (Top) */}
            {children.length > 0 && (
                <div className="flex items-end justify-center relative">
                    {/* Horizontal bar connecting children */}
                    {children.length > 1 && (
                        <div className="absolute bottom-0 h-px bg-gray-400 dark:bg-gray-500 left-0 right-0 mx-8 md:mx-16 -mb-4 hidden" />
                        // We need a better connector logic. Standard is:
                        // Parent connects to a horizontal bar.
                        // Horizontal bar connects to children.
                    )}

                    <div className="flex gap-4 sm:gap-8 border-b-2 border-gray-300 dark:border-gray-600 pb-8 px-2 mx-2">
                        {children.map(child => (
                            <TreeNode
                                key={child.id}
                                member={child}
                                allMembers={allMembers}
                                isOwner={isOwner}
                                reload={reload}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function TreeVisualizer({ members, rootId, isOwner, reload }: Props) {
    const rootMember = members.find(m => m.id === rootId);

    if (!rootMember) return <div>لا يوجد بيانات جذر</div>;

    return (
        <div className="flex justify-center pb-20 overflow-visible">
            <TreeNode
                member={rootMember}
                allMembers={members}
                isOwner={isOwner}
                reload={reload}
            />
        </div>
    );
}
