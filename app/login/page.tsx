import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="space-y-6 w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-center">Finplan</h1>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
