import Link from "next/link";
import type { Property } from "@/lib/properties";
import { categoryLabels, formatPrice, propertyImage } from "@/lib/properties";

export function PropertyCard({ property }: { property: Property }) {
  const image = propertyImage(property);
  return (
    <article className="property-card">
      <Link className="card-image-link" href={`/properties/${property.slug}`} aria-label={`View ${property.title}`}>
        {/* Remote listing images are provided by user-managed Supabase Storage. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="card-image" src={image} alt={property.images[0]?.alt_text ?? property.title} loading="lazy" />
        <span className="card-badge">{property.is_demo ? "Demo · " : ""}{property.listing_type === "sale" ? "For sale" : "For rent"}</span>
      </Link>
      <div className="card-content">
        <div className="card-category">{categoryLabels[property.category]}</div>
        <h3><Link href={`/properties/${property.slug}`}>{property.title}</Link></h3>
        <p className="card-location"><span aria-hidden="true">⌖</span> {property.location}, {property.city}</p>
        <div className="card-bottom">
          <strong>{formatPrice(property.price)}{property.listing_type === "rent" && <small> / year</small>}</strong>
          <span>{property.bedrooms ? `${property.bedrooms} bed` : ""}{property.bathrooms ? ` · ${property.bathrooms} bath` : ""}{property.area_value ? ` · ${property.area_value} ${property.area_unit}` : ""}</span>
        </div>
      </div>
    </article>
  );
}
