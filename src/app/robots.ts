import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/properties"], disallow: ["/dashboard", "/admin", "/login", "/register"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
