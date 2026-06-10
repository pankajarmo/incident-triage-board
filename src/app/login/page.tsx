import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/dal";
import { getAllowedDomain } from "@/lib/auth/config";
import LoginForm from "./login-form";

export default async function LoginPage() {
  // Already signed in → skip the form and go to the board.
  if (await getOptionalSession()) redirect("/");

  const domain = getAllowedDomain();
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Incident Triage Board
        </h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to continue. Access is limited to{" "}
          <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
            @{domain}
          </strong>{" "}
          addresses.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
