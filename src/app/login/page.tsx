import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                        تسجيل الدخول
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        للمشرفين والمسؤولين
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
