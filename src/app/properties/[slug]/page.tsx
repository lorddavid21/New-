import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PropertyGallery } from "@/components/property-gallery";
import { categoryLabels, formatPrice, getPublishedProperties, getPublishedPropertyBySlug } from "@/lib/properties";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublishedPropertyBySlug(slug);
  if (!property) return { title: "Property not found" };
  return {
    title: property.title,
    description: property.short_description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: { title: property.title, description: property.short_description, images: property.images.slice(0, 1).map((image) => image.storage_path) },
  };
}

function whatsappUrl(phone: string, title: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(`Hello, I'm interested in ${title}.`)}`;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getPublishedPropertyBySlug(slug);
  if (!property) return notFound();
  const { properties } = await getPublishedProperties(12);
  const similar = properties.filter((item) => item.id !== property.id && (item.category === property.category || item.city === property.city)).slice(0, 3);
  const phone = property.agent?.phone ?? "";
  const whatsapp = whatsappUrl(phone, property.title);

  return (
    <>
      <SiteHeader />
      <main className="detail-page">
        <Link href="/properties" className="back-link">← All properties</Link>
        <div className="detail-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> {property.is_demo ? "DEMO LISTING · " : ""}{categoryLabels[property.category]} · {property.listing_type === "sale" ? "FOR SALE" : "FOR RENT"}</div>
            <h1>{property.title}</h1>
            <p className="detail-location">⌖ {property.location}, {property.city}, {property.state}</p>
          </div>
          <strong className="detail-price">{formatPrice(property.price)}{property.listing_type === "rent" && <small> / year</small>}</strong>
        </div>
        <PropertyGallery images={property.images} title={property.title} />
        <div className="detail-columns">
          <section className="detail-main">
            <div className="detail-facts">
              {property.bedrooms !== null && <div><strong>{property.bedrooms}</strong><span>Bedrooms</span></div>}
              {property.bathrooms !== null && <div><strong>{property.bathrooms}</strong><span>Bathrooms</span></div>}
              {property.area_value !== null && <div><strong>{property.area_value} {property.area_unit}</strong><span>Area</span></div>}
              <div><strong>{property.status === "published" ? "Available" : property.status}</strong><span>Status</span></div>
            </div>
            <h2>About this property</h2>
            <p className="detail-description">{property.description}</p>
            <h2>Location</h2>
            <p className="detail-description">{property.location}, {property.city}, {property.state}</p>
            {property.video_url && <p className="detail-description"><a className="text-link" href={property.video_url} target="_blank" rel="noopener noreferrer">View property video ↗</a></p>}
          </section>
          <aside className="contact-card">
            <span className="contact-kicker">ENQUIRE ABOUT THIS PROPERTY</span>
            <h2>{property.agent?.full_name ?? "Listing agent"}</h2>
            <p>Contact the listing agent directly to arrange a viewing or ask a question.</p>
            {phone ? (
              <div className="contact-actions">
                <a className="button button-dark" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Call agent <span aria-hidden="true">↗</span></a>
                {whatsapp && <a className="button whatsapp-button" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true">↗</span></a>}
              </div>
            ) : <p className="contact-unavailable">Agent contact details are not available for this preview listing.</p>}
          </aside>
        </div>
        {similar.length > 0 && <section className="similar-section"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> MORE TO EXPLORE</div><h2>Similar <em>spaces.</em></h2></div></div><div className="property-grid">{similar.map((item) => <Link className="similar-card" href={`/properties/${item.slug}`} key={item.id}><span>{categoryLabels[item.category]}</span><strong>{item.title}</strong><small>{item.city} · {formatPrice(item.price)}</small></Link>)}</div></section>}
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
