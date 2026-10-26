import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { categoryLabels, demoProperties, type Property } from "@/lib/properties";

export const dynamic = "force-dynamic";
const pageSize = 24;
const currencies = new Set(["NGN", "USD", "GBP", "EUR"]);
const statuses = new Set(["sale", "rent"]);

function parsePrice(value: string | null) {
  if (!value) return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawOffset = Number.parseInt(params.get("offset") ?? "0", 10);
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.min(rawOffset, 10_000)) : 0;
  const query = (params.get("q") ?? "").trim().slice(0, 80).replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, " ");
  const rawCategory = params.get("category") ?? "";
  const category = Object.hasOwn(categoryLabels, rawCategory) ? rawCategory : "";
  const rawType = params.get("type") ?? "";
  const type = statuses.has(rawType) ? rawType : "";
  const rawCurrency = params.get("currency") ?? "";
  const currency = currencies.has(rawCurrency) ? rawCurrency : "";
  const minPrice = parsePrice(params.get("minPrice"));
  const maxPrice = parsePrice(params.get("maxPrice"));
  const rawBedrooms = Number.parseInt(params.get("bedrooms") ?? "", 10);
  const bedrooms = Number.isFinite(rawBedrooms) && rawBedrooms > 0 ? Math.min(rawBedrooms, 100) : null;
  const sort = ["price-low", "price-high"].includes(params.get("sort") ?? "") ? params.get("sort") : "newest";

  const matches = (property: Property) => {
    const term = query.toLowerCase();
    return (!term || `${property.title} ${property.short_description} ${property.city} ${property.state} ${property.location}`.toLowerCase().includes(term))
      && (!category || property.category === category)
      && (!type || property.listing_type === type)
      && (!currency || property.currency === currency)
      && (minPrice === null || property.price >= minPrice)
      && (maxPrice === null || property.price <= maxPrice)
      && (bedrooms === null || (property.bedrooms ?? 0) >= bedrooms);
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url && !key) {
    const results = demoProperties.filter(matches).sort((a, b) =>
      sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : Date.parse(b.created_at) - Date.parse(a.created_at));
    return NextResponse.json({ properties: results.slice(offset, offset + pageSize), count: results.length, isDemo: true });
  }
  if (!url || !key) return NextResponse.json({ error: "Property search is not configured." }, { status: 503 });

  const supabase = createClient(url, key);
  let queryBuilder = supabase.from("properties")
    .select("*, images:property_images(storage_path, alt_text, sort_order)", { count: "exact" })
    .eq("status", "published");
  if (query) queryBuilder = queryBuilder.or(`title.ilike.%${query}%,short_description.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%,location.ilike.%${query}%`);
  if (category) queryBuilder = queryBuilder.eq("category", category);
  if (type) queryBuilder = queryBuilder.eq("listing_type", type);
  if (currency) queryBuilder = queryBuilder.eq("currency", currency);
  if (minPrice !== null) queryBuilder = queryBuilder.gte("price", minPrice);
  if (maxPrice !== null) queryBuilder = queryBuilder.lte("price", maxPrice);
  if (bedrooms !== null) queryBuilder = queryBuilder.gte("bedrooms", bedrooms);
  const order = sort === "price-low" ? { column: "price", ascending: true } :
    sort === "price-high" ? { column: "price", ascending: false } : { column: "created_at", ascending: false };
  const { data, error, count } = await queryBuilder.order(order.column, { ascending: order.ascending })
    .range(offset, offset + pageSize - 1);
  if (error) return NextResponse.json({ error: "Unable to search published properties." }, { status: 500 });

  const properties = (data ?? []) as Property[];
  const paths = properties.flatMap((property) => property.images.map((image) => image.storage_path));
  if (paths.length) {
    const { data: signedImages, error: signedError } = await supabase.storage.from("property-media").createSignedUrls(paths, 60 * 60);
    if (signedError) return NextResponse.json({ error: "Unable to load property photographs." }, { status: 500 });
    const signedByPath = new Map(paths.map((path, index) => [path, signedImages[index]?.signedUrl]));
    for (const property of properties) {
      property.images = property.images.map((image) => ({
        ...image,
        storage_path: signedByPath.get(image.storage_path) ?? image.storage_path,
      }));
    }
  }
  return NextResponse.json({ properties, count: count ?? 0, isDemo: false });
}
