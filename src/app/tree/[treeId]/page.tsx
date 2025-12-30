"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTree, getTreeMembers, createRootMember } from "@/lib/treeService";
import { FamilyMember, FamilyTree } from "@/lib/types";
import TreeVisualizer from "@/components/TreeVisualizer";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function TreePage() {
    const params = useParams();
    const rawTreeId = params.treeId as string;
    const treeId = decodeURIComponent(rawTreeId);

    const [tree, setTree] = useState<FamilyTree | null>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [error, setError] = useState("");

    const [initMode, setInitMode] = useState(false);
    const [rootName, setRootName] = useState("");

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => setCurrentUser(u));
        return () => unsub();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        console.log("Fetching tree with ID:", treeId);
        try {
            const t = await getTree(treeId);
            if (t) {
                setTree(t);
                if (t.rootMemberId) {
                    const m = await getTreeMembers(treeId);
                    setMembers(m);
                } else {
                    setInitMode(true);
                }
            } else {
                console.warn("Tree not found in Firestore for ID:", treeId);
            }
        } catch (err: any) {
            console.error("Error fetching tree:", err);
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (treeId) fetchData();
    }, [treeId]);

    const handleCreateRoot = async () => {
        if (!rootName.trim()) return;
        try {
            await createRootMember(treeId, rootName, 'male');
            await fetchData();
            setInitMode(false);
        } catch (e) {
            alert("Error creating root");
        }
    };

    const isOwner = currentUser && tree && currentUser.uid === tree.adminId;

    if (loading) return <div className="text-center p-8">جاري تحميل الشجرة...</div>;

    if (error) {
        return (
            <div className="text-center p-8 text-red-600">
                <p className="font-bold text-xl">حدث خطأ أثناء تحميل الشجرة</p>
                <p className="mt-4 bg-red-50 inline-block p-4 rounded border border-red-200" dir="ltr">{error}</p>
                <p className="mt-2 text-sm text-gray-500">Tree ID: {treeId}</p>
            </div>
        );
    }

    if (!tree) {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-bold mb-4">الشجرة غير موجودة</h2>
                <p className="text-gray-600 mb-4">لم يتم العثور على شجرة بهذا المعرف.</p>
                <div className="bg-gray-100 p-2 inline-block rounded font-mono text-sm border">
                    Tree ID: {treeId}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900 dark:to-green-900 overflow-auto p-8">
            <header className="fixed top-0 left-0 right-0 p-4 bg-white/80 dark:bg-black/50 backdrop-blur-md shadow z-50 flex justify-between items-center">
                <h1 className="text-xl font-bold">{tree.name}</h1>
                <div className="flex gap-2">
                    {!currentUser && <a href="/login" className="text-sm underline">دخول المشرفين</a>}
                    {currentUser && <a href="/dashboard" className="text-sm underline">لوحة التحكم</a>}
                </div>
            </header>

            <main className="pt-20 min-h-[80vh] flex flex-col items-center justify-end pb-10">
                {initMode && isOwner ? (
                    <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
                        <h2 className="text-lg font-bold mb-4">ابدأ الشجرة</h2>
                        <p className="mb-4">أضف الجد المؤسس (الجذر) لهذه الشجرة.</p>
                        <input
                            className="border p-2 rounded w-full mb-4"
                            placeholder="اسم الجد المؤسس"
                            value={rootName}
                            onChange={e => setRootName(e.target.value)}
                        />
                        <button
                            onClick={handleCreateRoot}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
                        >
                            إنشاء الجذر
                        </button>
                    </div>
                ) : (
                    <>
                        {tree.rootMemberId ? (
                            <TreeVisualizer
                                members={members}
                                rootId={tree.rootMemberId}
                                isOwner={!!isOwner}
                                reload={fetchData}
                            />
                        ) : (
                            <div className="text-center text-gray-500">
                                لم يتم إنشاء الجذر بعد.
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
