import type { MetadataRoute } from "next";
import { getPublishedProperties } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { properties } = await getPublishedProperties();
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/properties`, changeFrequency: "hourly", priority: 0.9 },
    ...properties.map((property) => ({
      url: `${siteUrl}/properties/${property.slug}`,
      lastModified: property.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
