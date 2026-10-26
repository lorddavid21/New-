export type PropertyCategory = "house_land" | "room" | "commercial" | "batch_sale";
export type ListingType = "sale" | "rent";
export type PropertyStatus = "published" | "inactive" | "sold" | "rented";

export type Property = {
  id: string;
  slug: string;
  title: string;
  category: PropertyCategory;
  listing_type: ListingType;
  price: number;
  currency: string;
  short_description: string;
  description: string;
  state: string;
  city: string;
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_value: number | null;
  area_unit: string | null;
  video_url?: string | null;
  status: PropertyStatus;
  is_demo: boolean;
  created_at: string;
  agent_id: string;
  images: { id?: string; storage_path: string; alt_text: string | null; sort_order: number }[];
  agent?: { full_name: string; phone: string };
};

export const categoryLabels: Record<PropertyCategory, string> = {
  house_land: "Houses & land",
  room: "Rooms",
  commercial: "Commercial",
  batch_sale: "Batch sales",
};

export const demoProperties: Property[] = [
  {
    id: "demo-1",
    slug: "modern-4-bedroom-home-lekki",
    title: "Modern 4-bedroom home in Lekki",
    category: "house_land",
    listing_type: "sale",
    price: 185000000,
    currency: "NGN",
    short_description: "A light-filled family home with generous living space and a private garden.",
    description: "A thoughtfully designed family home in a well-connected Lekki neighbourhood. Spacious living areas open onto a private garden, while the upper floor offers four comfortable bedrooms and a quiet retreat from the city.",
    state: "Lagos",
    city: "Lekki",
    location: "Lekki Phase 1",
    bedrooms: 4,
    bathrooms: 4,
    area_value: 420,
    area_unit: "sqm",
    status: "published",
    is_demo: true,
    created_at: "2026-10-20T10:00:00.000Z",
    agent_id: "demo-agent",
    images: [
      { storage_path: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85", alt_text: "Contemporary two-storey home with landscaped garden", sort_order: 0 },
      { storage_path: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85", alt_text: "Sunlit modern property interior", sort_order: 1 },
    ],
    agent: { full_name: "Demo property", phone: "" },
  },
  {
    id: "demo-2",
    slug: "bright-2-bedroom-apartment-ikoyi",
    title: "Bright 2-bedroom apartment in Ikoyi",
    category: "house_land",
    listing_type: "rent",
    price: 12500000,
    currency: "NGN",
    short_description: "Calm, contemporary apartment close to the best of Ikoyi.",
    description: "A well-appointed apartment with natural light, a practical open-plan living area, and easy access to local amenities.",
    state: "Lagos",
    city: "Ikoyi",
    location: "Old Ikoyi",
    bedrooms: 2,
    bathrooms: 2,
    area_value: 160,
    area_unit: "sqm",
    status: "published",
    is_demo: true,
    created_at: "2026-10-18T10:00:00.000Z",
    agent_id: "demo-agent",
    images: [
      { storage_path: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85", alt_text: "Warm modern apartment living room", sort_order: 0 },
      { storage_path: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85", alt_text: "Comfortable contemporary apartment interior", sort_order: 1 },
    ],
    agent: { full_name: "Demo property", phone: "" },
  },
  {
    id: "demo-3",
    slug: "serviced-office-victoria-island",
    title: "Serviced office on Victoria Island",
    category: "commercial",
    listing_type: "rent",
    price: 18000000,
    currency: "NGN",
    short_description: "Flexible, move-in-ready office space in a central business district.",
    description: "A flexible commercial space suited to a growing business, with an efficient floor plan and access to the Victoria Island business district.",
    state: "Lagos",
    city: "Victoria Island",
    location: "Victoria Island",
    bedrooms: null,
    bathrooms: 2,
    area_value: 210,
    area_unit: "sqm",
    status: "published",
    is_demo: true,
    created_at: "2026-10-16T10:00:00.000Z",
    agent_id: "demo-agent",
    images: [
      { storage_path: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85", alt_text: "Bright contemporary shared office interior", sort_order: 0 },
      { storage_path: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85", alt_text: "Modern collaborative office area", sort_order: 1 },
    ],
    agent: { full_name: "Demo property", phone: "" },
  },
  {
    id: "demo-4",
    slug: "serviced-room-surulere",
    title: "Private room in Surulere",
    category: "room",
    listing_type: "rent",
    price: 950000,
    currency: "NGN",
    short_description: "A tidy private room in a convenient, well-connected neighbourhood.",
    description: "A private room in a shared residence, close to transport and everyday conveniences.",
    state: "Lagos",
    city: "Surulere",
    location: "Aguda",
    bedrooms: 1,
    bathrooms: 1,
    area_value: null,
    area_unit: null,
    status: "published",
    is_demo: true,
    created_at: "2026-10-14T10:00:00.000Z",
    agent_id: "demo-agent",
    images: [
      { storage_path: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85", alt_text: "Bright, simply furnished bedroom", sort_order: 0 },
      { storage_path: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1200&q=85", alt_text: "Calm furnished bedroom interior", sort_order: 1 },
    ],
    agent: { full_name: "Demo property", phone: "" },
  },
];

export function formatPrice(price: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function propertyImage(property: Property) {
  return property.images[0]?.storage_path ?? "/property-placeholder.svg";
}

export async function getPublishedProperties(limit = 100): Promise<{ properties: Property[]; isDemo: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url && !key) return { properties: demoProperties.slice(0, limit), isDemo: true };
  if (!url || !key) throw new Error("Supabase configuration is incomplete. Set both the project URL and publishable key.");

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key);
  const { data, error } = await client
    .from("properties")
    .select("*, images:property_images(storage_path, alt_text, sort_order)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to load published properties.");

  const properties = (data ?? []) as Property[];
  const paths = properties.flatMap((property) => property.images.map((image) => image.storage_path));
  if (paths.length) {
    const { data: signedImages, error: signedError } = await client.storage.from("property-media").createSignedUrls(paths, 60 * 60);
    if (signedError) throw new Error("Unable to load published property photographs.");
    const signedByPath = new Map(paths.map((path, index) => [path, signedImages[index]?.signedUrl]));
    for (const property of properties) {
      property.images = property.images.map((image) => ({
        ...image,
        storage_path: signedByPath.get(image.storage_path) ?? image.storage_path,
      }));
    }
  }
  return { properties, isDemo: false };
}

export async function getPublishedPropertyBySlug(slug: string): Promise<Property | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url && !key) return demoProperties.find((property) => property.slug === slug) ?? null;
  if (!url || !key) throw new Error("Supabase configuration is incomplete. Set both the project URL and publishable key.");

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key);
  const { data, error } = await client
    .from("properties")
    .select("*, images:property_images(storage_path, alt_text, sort_order)")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Unable to load this property.");
  if (!data) return null;

  const property = data as Property;
  if (property.images.length) {
    const { data: signedImages, error: signedError } = await client.storage.from("property-media")
      .createSignedUrls(property.images.map((image) => image.storage_path), 60 * 60);
    if (signedError) throw new Error("Unable to load this property's photographs.");
    property.images = property.images.map((image, index) => ({
      ...image,
      storage_path: signedImages[index]?.signedUrl ?? image.storage_path,
    }));
  }
  const { data: agent, error: agentError } = await client
    .from("public_agent_contacts")
    .select("full_name, phone")
    .eq("agent_id", property.agent_id)
    .maybeSingle();
  if (agentError) throw new Error("Unable to load the agent's public contact details.");
  property.agent = agent ?? undefined;
  return property;
}
