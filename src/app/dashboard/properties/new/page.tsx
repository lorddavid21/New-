import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CreateListingForm } from "@/components/listing-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Add a property", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewPropertyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).single();
  if (error || !profile || profile.account_status !== "active") return redirect("/login?error=disabled");
  if (profile.role === "admin") return redirect("/admin");

  return (
    <>
      <SiteHeader />
      <main className="dashboard-page form-page">
        <Link className="back-link" href="/dashboard">← Dashboard</Link>
        <div className="dashboard-top"><div><div className="eyebrow"><span className="eyebrow-line" /> NEW LISTING</div><h1>Introduce your property.</h1><p>Complete the details below. Your listing will be published after it has been saved.</p></div></div>
        <CreateListingForm error={params.error} />
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
