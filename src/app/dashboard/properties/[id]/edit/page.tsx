import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { EditListingForm } from "@/components/listing-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/properties";

export const metadata = { title: "Edit property", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, queryParams] = await Promise.all([params, searchParams]);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).single();
  if (profileError || !profile || profile.account_status !== "active") return redirect("/login?error=disabled");

  const { data, error } = await supabase.from("properties")
    .select("*, images:property_images(id, storage_path, alt_text, sort_order)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return notFound();
  if (profile.role !== "admin" && data.agent_id !== user.id) return notFound();
  const property = data as Property;
  property.images.sort((a, b) => a.sort_order - b.sort_order);
  if (property.images.length) {
    const { data: signedImages, error: signedError } = await supabase.storage.from("property-media")
      .createSignedUrls(property.images.map((image) => image.storage_path), 60 * 60);
    if (signedError) throw new Error("Unable to load photographs for this property.");
    property.images = property.images.map((image, index) => ({
      ...image,
      storage_path: signedImages[index]?.signedUrl ?? image.storage_path,
    }));
  }

  return (
    <>
      <SiteHeader />
      <main className="dashboard-page form-page">
        <Link className="back-link" href="/dashboard">← Dashboard</Link>
        <div className="dashboard-top"><div><div className="eyebrow"><span className="eyebrow-line" /> EDIT LISTING</div><h1>Update your property.</h1><p>Keep or replace photos while maintaining at least two on the listing.</p></div></div>
        <EditListingForm property={property} error={queryParams.error} />
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
