"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getUserData, UserData } from "@/lib/db";

export default function DashboardPage() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [createData, setCreateData] = useState({ email: "", password: "", treeName: "" });
    const [createStatus, setCreateStatus] = useState({ loading: false, error: "", success: "" });

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                // Fetch custom user data (role) from Firestore
                const userData = await getUserData(authUser.uid);
                if (userData) {
                    setUser(userData);
                } else {
                    console.warn("User authenticated but no Firestore record found.");
                    // Optional: Create basic user record if missing?
                }
            } else {
                router.push("/login");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateStatus({ loading: true, error: "", success: "" });

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...createData,
                    callerToken: token,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create admin");
            }

            setCreateStatus({ loading: false, error: "", success: "success" });
            // setCreateData({ email: "", password: "", treeName: "" }); // Keep data for display
        } catch (err: any) {
            setCreateStatus({ loading: false, error: err.message, success: "" });
        }
    };

    if (loading) {
        return <div className="p-8 text-center">جاري التحميل...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="p-8 min-h-screen bg-gray-50 dark:bg-zinc-900">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">لوحة التحكم</h1>
                    <div className="flex gap-4 items-center">
                        <span>{user.email}</span>
                        <button
                            onClick={() => auth.signOut()}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors text-sm"
                        >
                            تسجيل الخروج
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md mb-8">
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                        الدور: <span className="font-bold text-indigo-600 dark:text-indigo-400">{user.role === "super_admin" ? "مشرف عام" : "مشرف شجرة"}</span>
                    </p>
                    {user.role === "admin" && user.treeId && (
                        <p>
                            معرف الشجرة: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user.treeId}</code>
                        </p>
                    )}
                </div>

                {user.role === "super_admin" ? (
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold mb-6 border-b pb-2">إنشاء مشرف شجرة جديد</h3>

                        <form onSubmit={handleCreateAdmin} className="space-y-4 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم العائلة / الشجرة</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                                    value={createData.treeName}
                                    onChange={(e) => setCreateData({ ...createData, treeName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">البريد الإلكتروني للمشرف</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-left"
                                    dir="ltr"
                                    value={createData.email}
                                    onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">كلمة المرور</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-left"
                                    dir="ltr"
                                    value={createData.password}
                                    onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                                />
                            </div>

                            {createStatus.error && <p className="text-red-500 text-sm">{createStatus.error}</p>}
                            {createStatus.error && <p className="text-red-500 text-sm">{createStatus.error}</p>}
                            {createStatus.success && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800 text-sm mb-4">
                                    <p className="font-bold mb-2">✅ تم إنشاء المشرف والشجرة بنجاح!</p>
                                    <p>البريد: <span className="font-mono select-all bg-white px-1 border rounded">{createData.email}</span></p>
                                    <p>كلمة المرور: <span className="font-mono select-all bg-white px-1 border rounded">{createData.password}</span></p>
                                    <p className="mt-2 text-xs text-green-600">يمكنك الآن تسجيل الخروج والدخول باستخدام هذا الحساب لإدارة الشجرة.</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={createStatus.loading}
                                className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 w-full md:w-auto"
                            >
                                {createStatus.loading ? "جاري الإنشاء..." : "إنشاء المشرف والشجرة"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md text-center">
                        <h3 className="text-xl font-bold mb-4">إدارة شجرة العائلة</h3>
                        <p className="text-gray-600 mb-6">يمكنك الآن البدء في بناء وإدارة شجرة العائلة الخاصة بك.</p>

                        {user.treeId ? (
                            <a
                                href={`/tree/${user.treeId}`}
                                className="inline-block bg-indigo-600 text-white text-lg px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                            >
                                🌳 الدخول إلى شجرة العائلة
                            </a>
                        ) : (
                            <p className="text-red-500">لا يوجد شجرة مرتبطة بهذا الحساب. يرجى مراجعة المشرف العام.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
