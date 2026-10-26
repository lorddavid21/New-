import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DeleteListingForm } from "@/components/listing-form";
import { logoutAction } from "@/app/auth-actions";
import { setListingStatusAction } from "@/app/listing-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrice, type Property } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; warning?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, role, account_status").eq("id", user.id).single();
  if (profileError || !profile || profile.account_status !== "active") return redirect("/login?error=disabled");
  if (profile.role === "admin") return redirect("/admin");

  const { data: properties, error } = await supabase.from("properties")
    .select("id, slug, title, listing_type, price, currency, status, city, created_at")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load your listings.");

  const listings = (properties ?? []) as Pick<Property, "id" | "slug" | "title" | "listing_type" | "price" | "currency" | "status" | "city" | "created_at">[];
  const published = listings.filter((property) => property.status === "published").length;
  const inactive = listings.length - published;

  return (
    <>
      <SiteHeader />
      <main className="dashboard-page">
        <div className="dashboard-top">
          <div><div className="eyebrow"><span className="eyebrow-line" /> AGENT WORKSPACE</div><h1>Welcome, {profile.full_name.split(" ")[0]}.</h1><p>Keep your properties up to date and easy to find.</p></div>
          <div className="dashboard-actions"><Link className="button button-dark" href="/dashboard/properties/new">Add a property <span aria-hidden="true">↗</span></Link><form action={logoutAction}><button className="quiet-button" type="submit">Sign out</button></form></div>
        </div>
        {params.notice === "published" && <p className="form-success" role="status">Your property is published.</p>}
        {params.notice === "deleted" && <p className="form-success" role="status">Property deleted.</p>}
        {params.notice === "updated" && <p className="form-success" role="status">Listing status updated.</p>}
        {params.warning === "media-cleanup" && <p className="form-alert" role="alert">The listing was updated, but a removed photograph could not be cleaned up. Contact support for media cleanup.</p>}
        {params.error && <p className="form-alert" role="alert">{params.error === "media-cleanup" ? "The listing was deleted, but some media could not be removed. Contact support for cleanup." : "We couldn't complete that request. Refresh and try again."}</p>}
        <div className="stats-grid">
          <article><span>Total properties</span><strong>{listings.length}</strong></article>
          <article><span>Published</span><strong>{published}</strong></article>
          <article><span>Inactive or closed</span><strong>{inactive}</strong></article>
        </div>
        <section className="dashboard-section">
          <div className="dashboard-section-heading"><h2>Your properties</h2><span>{listings.length} total</span></div>
          {listings.length ? <div className="listing-table-wrap"><table className="listing-table"><thead><tr><th>Property</th><th>Location</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {listings.map((property) => <tr key={property.id}>
              <td><strong>{property.title}</strong><small>{property.listing_type === "sale" ? "For sale" : "For rent"}</small></td>
              <td>{property.city}</td><td>{formatPrice(property.price, property.currency)}</td>
              <td><span className={`status-badge status-${property.status}`}>{property.status}</span></td>
              <td><div className="row-actions">
                {property.status === "published" ? <Link className="table-action" href={`/properties/${property.slug}`}>View</Link> : <span className="table-action">Not public</span>}
                <Link className="table-action" href={`/dashboard/properties/${property.id}/edit`}>Edit</Link>
                {property.status === "published" || property.status === "inactive" ? <form action={setListingStatusAction}><input type="hidden" name="id" value={property.id} /><input type="hidden" name="status" value={property.status === "published" ? "inactive" : "published"} /><button className="table-action" type="submit">{property.status === "published" ? "Deactivate" : "Publish"}</button></form> : <span className="table-action">{property.status}</span>}
                <DeleteListingForm property={property} />
              </div></td>
            </tr>)}
          </tbody></table></div> : <div className="empty-state"><h3>Your next listing starts here.</h3><p>Add a property and connect with people searching for their next place.</p><Link className="button button-dark" href="/dashboard/properties/new">Add your first property <span aria-hidden="true">↗</span></Link></div>}
        </section>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
