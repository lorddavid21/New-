import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DeleteListingForm } from "@/components/listing-form";
import { logoutAction } from "@/app/auth-actions";
import { setAgentAccountAction, setListingStatusAction } from "@/app/listing-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categoryLabels, formatPrice } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; notice?: string; propertyPage?: string; propertyQuery?: string; propertyStatus?: string; propertyCategory?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).single();
  if (profileError || profile?.role !== "admin" || profile.account_status !== "active") return redirect("/dashboard");

  const propertyPage = Math.max(1, Number.parseInt(params.propertyPage ?? "1", 10) || 1);
  const pageSize = 25;
  const propertyQuery = (params.propertyQuery ?? "").trim().slice(0, 100).replace(/[^a-zA-Z0-9\s-]/g, "");
  const propertyStatus = ["published", "inactive", "sold", "rented"].includes(params.propertyStatus ?? "") ? params.propertyStatus : "";
  const propertyCategory = Object.hasOwn(categoryLabels, params.propertyCategory ?? "") ? params.propertyCategory : "";
  let listingsQuery = supabase.from("properties")
    .select("id, slug, title, listing_type, price, currency, status, city, agent_id, created_at", { count: "exact" });
  if (propertyQuery) listingsQuery = listingsQuery.or(`title.ilike.%${propertyQuery}%,city.ilike.%${propertyQuery}%,location.ilike.%${propertyQuery}%`);
  if (propertyStatus) listingsQuery = listingsQuery.eq("status", propertyStatus);
  if (propertyCategory) listingsQuery = listingsQuery.eq("category", propertyCategory);
  const [{ data: profiles, error: agentsError }, { data: properties, error: listingsError, count: listingCount }, { count: totalListingCount, error: totalError }, { count: publishedCount, error: publishedError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, role, account_status, created_at").eq("role", "agent").order("created_at", { ascending: false }),
    listingsQuery.order("created_at", { ascending: false }).range((propertyPage - 1) * pageSize, propertyPage * pageSize - 1),
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);
  if (agentsError || listingsError || totalError || publishedError) throw new Error("Unable to load administration data.");
  const term = (params.q ?? "").trim().toLowerCase();
  const agents = (profiles ?? []).filter((agent) => !term || `${agent.full_name} ${agent.phone}`.toLowerCase().includes(term));
  const allListings = properties ?? [];
  function propertyPageHref(page: number) {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (propertyQuery) query.set("propertyQuery", propertyQuery);
    if (propertyStatus) query.set("propertyStatus", propertyStatus);
    if (propertyCategory) query.set("propertyCategory", propertyCategory);
    query.set("propertyPage", String(page));
    return `/admin?${query.toString()}`;
  }

  return (
    <>
      <SiteHeader />
      <main className="dashboard-page">
        <div className="dashboard-top"><div><div className="eyebrow"><span className="eyebrow-line" /> ADMINISTRATION</div><h1>Platform overview.</h1><p>Manage agent accounts and property listings.</p></div><form action={logoutAction}><button className="quiet-button" type="submit">Sign out</button></form></div>
        {params.notice && <p className="form-success" role="status">{params.notice === "agent" ? "Agent account status updated." : "Listing updated."}</p>}
        {params.error && <p className="form-alert" role="alert">Unable to complete the administrative request. Please try again.</p>}
        <div className="stats-grid">
          <article><span>Total listings</span><strong>{totalListingCount ?? 0}</strong></article>
          <article><span>Published listings</span><strong>{publishedCount ?? 0}</strong></article>
          <article><span>Registered agents</span><strong>{profiles?.length ?? 0}</strong></article>
        </div>
        <section className="dashboard-section admin-section">
          <div className="dashboard-section-heading"><h2>Agents</h2><span>{agents.length} matching</span></div>
          <form className="agent-search" action="/admin"><label htmlFor="agent-search">Search agents</label><input id="agent-search" name="q" defaultValue={params.q} placeholder="Name or phone" /><button className="button button-dark" type="submit">Search</button></form>
          <div className="listing-table-wrap"><table className="listing-table"><thead><tr><th>Agent</th><th>Phone</th><th>Joined</th><th>Account status</th><th>Action</th></tr></thead><tbody>
            {agents.map((agent) => <tr key={agent.id}>
              <td><strong>{agent.full_name}</strong></td><td>{agent.phone}</td><td>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(agent.created_at))}</td>
              <td><span className={`status-badge status-${agent.account_status}`}>{agent.account_status}</span></td>
              <td><form action={setAgentAccountAction}><input type="hidden" name="user_id" value={agent.id} /><input type="hidden" name="status" value={agent.account_status === "active" ? "disabled" : "active"} /><button className="table-action" type="submit">{agent.account_status === "active" ? "Disable account" : "Reactivate"}</button></form></td>
            </tr>)}
          </tbody></table></div>
          {!agents.length && <div className="empty-state"><h3>No agents found.</h3><p>Try a different name or phone number.</p></div>}
        </section>
        <section className="dashboard-section admin-section">
          <div className="dashboard-section-heading"><h2>All properties</h2><span>Page {propertyPage} of {Math.max(1, Math.ceil((listingCount ?? 0) / pageSize))}</span></div>
          <form className="admin-property-search" action="/admin">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            <label>Search title or location<input name="propertyQuery" defaultValue={params.propertyQuery} maxLength={100} /></label>
            <label>Category<select name="propertyCategory" defaultValue={propertyCategory}><option value="">All categories</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Status<select name="propertyStatus" defaultValue={propertyStatus}><option value="">All statuses</option><option value="published">Published</option><option value="inactive">Inactive</option><option value="sold">Sold</option><option value="rented">Rented</option></select></label>
            <button className="button button-dark" type="submit">Filter</button>
          </form>
          <div className="listing-table-wrap"><table className="listing-table"><thead><tr><th>Property</th><th>Agent ID</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {allListings.map((property) => <tr key={property.id}>
              <td><strong>{property.title}</strong><small>{property.city} · {property.listing_type}</small></td><td>{property.agent_id.slice(0, 8)}…</td><td>{formatPrice(property.price, property.currency)}</td>
              <td><span className={`status-badge status-${property.status}`}>{property.status}</span></td>
              <td><div className="row-actions">
                {property.status === "published" ? <Link className="table-action" href={`/properties/${property.slug}`}>View</Link> : <span className="table-action">Not public</span>}
                <Link className="table-action" href={`/dashboard/properties/${property.id}/edit`}>Edit</Link>
                {property.status === "published" || property.status === "inactive" ? <form action={setListingStatusAction}><input type="hidden" name="id" value={property.id} /><input type="hidden" name="status" value={property.status === "published" ? "inactive" : "published"} /><button className="table-action" type="submit">{property.status === "published" ? "Deactivate" : "Publish"}</button></form> : <span className="table-action">{property.status}</span>}
                <DeleteListingForm property={property} />
              </div></td>
            </tr>)}
          </tbody></table></div>
          <nav className="admin-pagination" aria-label="Property list pages">
            {propertyPage > 1 ? <Link href={propertyPageHref(propertyPage - 1)}>← Previous</Link> : <span>← Previous</span>}
            {propertyPage * pageSize < (listingCount ?? 0) ? <Link href={propertyPageHref(propertyPage + 1)}>Next →</Link> : <span>Next →</span>}
          </nav>
        </section>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
