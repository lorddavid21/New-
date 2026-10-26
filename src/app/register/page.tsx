import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { registerAction } from "@/app/auth-actions";

export const metadata: Metadata = { title: "Create agent account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="auth-page">
        <section className="auth-card">
          <div className="eyebrow"><span className="eyebrow-line" /> JOIN HAVEN ESTATE</div>
          <h1>List with <em>confidence.</em></h1>
          <p>Create an agent account to publish and manage your properties.</p>
          {params.error && <p className="form-alert" role="alert">{params.error === "invalid" ? "Review your details. Passwords must match and be at least 10 characters." : "We couldn't create your account. Check your details and try again."}</p>}
          <form action={registerAction} className="auth-form">
            <label>Full name<input name="full_name" autoComplete="name" minLength={2} maxLength={120} required /></label>
            <label>Phone number<input name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={24} placeholder="+234…" required /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label>
            <label>Confirm password<input name="password_confirmation" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label>
            <button className="button button-dark auth-submit" type="submit">Create account <span aria-hidden="true">↗</span></button>
          </form>
          <div className="auth-foot">Already registered? <Link href="/login">Sign in</Link></div>
        </section>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
