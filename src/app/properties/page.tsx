import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { PropertyDirectory } from "@/components/property-directory";
import { getPublishedProperties } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Explore properties",
  description: "Browse homes, land, rooms and commercial properties across Nigeria.",
  alternates: { canonical: "/properties" },
};
export const dynamic = "force-dynamic";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { properties, isDemo } = await getPublishedProperties(24);
  const q = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const type = typeof params.type === "string" ? params.type : "";
  const currency = typeof params.currency === "string" ? params.currency : "NGN";
  const minPrice = typeof params.minPrice === "string" ? params.minPrice : "";
  const maxPrice = typeof params.maxPrice === "string" ? params.maxPrice : "";

  return (
    <>
      <SiteHeader />
      <main className="listing-page">
        <div className="listing-intro">
          <div className="eyebrow"><span className="eyebrow-line" /> FIND YOUR NEXT PLACE</div>
          <h1>Places with <em>possibility.</em></h1>
          <p>Explore homes, rooms and spaces to suit the way you live and work.</p>
        </div>
        {isDemo && <p className="demo-note">Preview listings shown for design purposes. Connect Supabase to display verified properties.</p>}
        <PropertyDirectory properties={properties} initialQuery={q} initialCategory={category} initialType={type} initialCurrency={currency} initialMinPrice={minPrice} initialMaxPrice={maxPrice} />
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} Haven Estate</span></footer>
    </>
  );
}
