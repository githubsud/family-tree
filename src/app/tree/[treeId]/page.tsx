"use client";

import { useEffect, useState, useCallback } from "react";
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

    // Init mode states
    const [initMode, setInitMode] = useState(false);
    const [rootName, setRootName] = useState("");

    // Search states
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchAnswer, setSearchAnswer] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Auth listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsub();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            console.log("Fetching tree:", treeId);
            const t = await getTree(treeId);
            if (t) {
                setTree(t);
                if (t.rootMemberId) {
                    const m = await getTreeMembers(treeId);
                    setMembers(m);
                    setInitMode(false);
                } else {
                    setInitMode(true);
                }
            } else {
                console.error("Tree not found");
                setError("Tree not found");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [treeId]);

    useEffect(() => {
        if (treeId) {
            fetchData();
        }
    }, [treeId, fetchData]);

    const handleCreateRoot = async () => {
        if (!tree || !currentUser) return;
        if (!rootName.trim()) return;

        try {
            await createRootMember(tree.id, rootName);
            setRootName("");
            fetchData();
        } catch (err) {
            alert("فشل إنشاء الجذر");
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchAnswer("");

        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery, treeId })
            });
            const data = await res.json();
            if (data.answer) {
                setSearchAnswer(data.answer);
            } else if (data.error) {
                setSearchAnswer("حدث خطأ: " + data.error);
            }
        } catch (err) {
            setSearchAnswer("فشل الاتصال بالخادم");
        } finally {
            setIsSearching(false);
        }
    };

    const isOwner = currentUser && tree && currentUser.uid === tree.adminId;

    if (loading) {
        return <div className="text-center p-10">تحميل الشجرة...</div>;
    }

    if (!tree) {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-bold mb-4">الشجرة غير موجودة</h2>
                <div className="bg-gray-100 p-4 inline-block rounded text-left" dir="ltr">
                    <p>Tree ID: {treeId}</p>
                    <p className="text-sm text-gray-500">
                        إذا كنت قد أنشأت الشجرة للتو، يرجى الانتظار قليلاً أو التأكد من الرابط.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900 dark:to-green-900 overflow-auto">
            {/* Header - Hidden on Print */}
            <header className="fixed top-0 left-0 right-0 p-4 bg-white/80 dark:bg-black/50 backdrop-blur-md shadow z-50 flex justify-between items-center print:hidden">
                <h1 className="text-xl font-bold">{tree.name}</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSearch(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm shadow flex items-center gap-1"
                    >
                        <span>✨</span>
                        <span className="hidden sm:inline">سؤال AI</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm shadow flex items-center gap-1"
                    >
                        <span>🖨️</span>
                        <span className="hidden sm:inline">طباعة PDF</span>
                    </button>
                    {!currentUser && <a href="/login" className="text-sm underline px-2">دخول المشرفين</a>}
                    {currentUser && <a href="/dashboard" className="text-sm underline px-2">لوحة التحكم</a>}
                </div>
            </header>

            {/* AI Search Modal */}
            {showSearch && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 print:hidden" onClick={() => setShowSearch(false)}>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-purple-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <span className="text-2xl">✨</span>
                                <span>اسأل عن العائلة</span>
                            </h3>
                            <button onClick={() => setShowSearch(false)} className="text-gray-500 hover:text-red-500 text-xl font-bold">&times;</button>
                        </div>

                        <form onSubmit={handleSearch} className="mb-4">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 border p-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="من هم أبناء فلان"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isSearching ? '...' : 'اسأل'}
                                </button>
                            </div>
                        </form>

                        {searchAnswer && (
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-100 dark:border-purple-800 animate-in fade-in slide-in-from-bottom-2">
                                <p className="whitespace-pre-wrap leading-relaxed">{searchAnswer}</p>
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span>جرب:</span>
                            <span className="bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200" onClick={() => setSearchQuery("من هم أبناء " + (tree.name?.split(' ')[0] || "فلان"))}>من هم أبناء فلان</span>
                            <span className="bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200" onClick={() => setSearchQuery("ما علاقة فلان بفلان")}>ما علاقة فلان بفلان</span>
                            <span className="bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200" onClick={() => setSearchQuery("من يقيم في السودان")}>من يقيم في السودان</span>
                            <span className="bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200" onClick={() => setSearchQuery("كم عدد أبناء " + (tree.name || "المؤسس"))}>إحصائيات</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="pt-24 min-h-[90vh] flex flex-col items-center justify-end pb-10 print:pt-0 print:pb-0 print:block">
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
                    <div className="w-full h-full flex flex-col justify-end">
                        {tree.rootMemberId ? (
                            <div className="min-w-max min-h-max p-10 m-auto">
                                <TreeVisualizer
                                    members={members}
                                    rootId={tree.rootMemberId}
                                    isOwner={!!isOwner}
                                    reload={fetchData}
                                />
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 m-auto">
                                {loading ? "جاري التحميل..." : "لم يتم إنشاء الجذر بعد."}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
