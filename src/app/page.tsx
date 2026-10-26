import Link from "next/link";
import { PropertyCard } from "@/components/property-card";
import { SiteHeader } from "@/components/site-header";
import { getPublishedProperties } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { properties, isDemo } = await getPublishedProperties(3);
  const featured = properties.slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line" /> FIND A PLACE TO CALL YOURS</div>
            <h1>Space for the<br /><em>life you imagine.</em></h1>
            <p>Thoughtful homes and places, found with confidence.</p>
            <form className="search-panel" action="/properties">
              <label className="search-field">
                <span>Location</span>
                <input name="q" placeholder="City, neighbourhood or state" />
              </label>
              <label className="search-field search-kind">
                <span>Looking to</span>
                <select name="type" defaultValue="">
                  <option value="">Buy or rent</option>
                  <option value="sale">Buy</option>
                  <option value="rent">Rent</option>
                </select>
              </label>
              <button className="button button-accent" type="submit">Explore homes <span aria-hidden="true">↗</span></button>
            </form>
            <div className="hero-note"><span className="note-dot" /> A more considered way to find your next place</div>
          </div>
          <div className="hero-caption"><span>01</span> ARCHITECTURE, AT HOME</div>
        </section>

        <section className="category-strip" aria-label="Browse by category">
          {[
            ["01", "Houses & land", "house_land"],
            ["02", "Rooms", "room"],
            ["03", "Commercial", "commercial"],
            ["04", "Batch sales", "batch_sale"],
          ].map(([number, label, category]) => (
            <Link className="category-link" href={`/properties?category=${category}`} key={category}>
              <span className="category-number">{number}</span><span>{label}</span><span className="category-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </section>

        <section className="section featured-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> A PLACE TO BEGIN</div>
              <h2>Spaces worth<br /><em>coming home to.</em></h2>
            </div>
            <Link className="text-link" href="/properties">View all properties <span aria-hidden="true">↗</span></Link>
          </div>
          {isDemo && <p className="demo-note">Preview listings shown for design purposes. Connect Supabase to display verified properties.</p>}
          {featured.length ? (
            <div className="property-grid">
              {featured.map((property) => <PropertyCard property={property} key={property.id} />)}
            </div>
          ) : (
            <div className="empty-state"><h3>New listings are on the way.</h3><p>Check back soon to discover available spaces.</p></div>
          )}
        </section>

        <section className="callout">
          <div className="callout-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> FOR PROPERTY PROFESSIONALS</div>
            <h2>Good places deserve<br /><em>to be found.</em></h2>
            <p>Share your property with people looking for their next chapter.</p>
            <Link className="button button-light" href="/register">List your property <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="callout-mark" aria-hidden="true">h.</div>
        </section>
      </main>
      <footer className="site-footer">
        <Link className="brand footer-brand" href="/"><span className="brand-mark">h.</span><span>haven<span className="brand-light">estate</span></span></Link>
        <p>Find a place for what comes next.</p>
        <div><Link href="/properties">Explore properties</Link><Link href="/login">Agent sign in</Link></div>
        <small>© {new Date().getFullYear()} Haven Estate. All rights reserved.</small>
      </footer>
    </>
  );
}
