import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { loginAction } from "@/app/auth-actions";

export const metadata: Metadata = { title: "Agent sign in", robots: { index: false } };

const errorMessages: Record<string, string> = {
  invalid: "Enter a valid email and password of at least 8 characters.",
  credentials: "Email or password is incorrect.",
  disabled: "This account is currently disabled. Contact the platform administrator.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="auth-page">
        <section className="auth-card">
          <div className="eyebrow"><span className="eyebrow-line" /> AGENT PORTAL</div>
          <h1>Welcome <em>back.</em></h1>
          <p>Sign in to manage your property listings.</p>
          {params.error && <p className="form-alert" role="alert">{errorMessages[params.error] ?? "Unable to sign in."}</p>}
          {params.notice === "verify" && <p className="form-success" role="status">Check your email to verify your account before signing in.</p>}
          {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && <p className="form-alert">Supabase is not configured. Add the environment variables in <code>.env.local</code> to enable accounts.</p>}
          <form action={loginAction} className="auth-form">
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
            <button className="button button-dark auth-submit" type="submit">Sign in <span aria-hidden="true">↗</span></button>
          </form>
          <div className="auth-foot">New to Haven? <Link href="/register">Create an agent account</Link></div>
        </section>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
