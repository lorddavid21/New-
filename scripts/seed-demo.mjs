import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const agentId = process.env.SEED_AGENT_ID;

if (process.env.SEED_DEVELOPMENT_ONLY !== "true") {
  throw new Error("Set SEED_DEVELOPMENT_ONLY=true only when targeting a development Supabase project.");
}
if (!url || !serviceKey || !agentId) {
  throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SEED_AGENT_ID in the process environment.");
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(agentId)) {
  throw new Error("SEED_AGENT_ID must be a UUID.");
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: agent, error: agentError } = await supabase.from("profiles").select("id, role, account_status").eq("id", agentId).single();
if (agentError || !agent || agent.role !== "agent" || agent.account_status !== "active") {
  throw new Error("SEED_AGENT_ID must identify an active agent in the development Supabase project.");
}

const examples = [
  {
    slug: "demo-lekki-family-home",
    title: "[DEMO] Modern family home in Lekki",
    category: "house_land",
    listing_type: "sale",
    price: 185000000,
    short_description: "Sample listing only. Replace with verified property information before launch.",
    description: "DEVELOPMENT SAMPLE ONLY. This example illustrates listing fields and is not a real property offer. Replace all details and photographs with verified client information before publishing a production website.",
    state: "Lagos",
    city: "Lekki",
    location: "Development sample address",
    bedrooms: 4,
    bathrooms: 4,
    area_value: 420,
    area_unit: "sqm",
    photos: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80&fm=jpg",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80&fm=jpg",
    ],
  },
  {
    slug: "demo-ikoyi-apartment",
    title: "[DEMO] Bright apartment in Ikoyi",
    category: "house_land",
    listing_type: "rent",
    price: 12500000,
    short_description: "Sample listing only. Replace with verified property information before launch.",
    description: "DEVELOPMENT SAMPLE ONLY. This example illustrates listing fields and is not a real property offer. Replace all details and photographs with verified client information before publishing a production website.",
    state: "Lagos",
    city: "Ikoyi",
    location: "Development sample address",
    bedrooms: 2,
    bathrooms: 2,
    area_value: 160,
    area_unit: "sqm",
    photos: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80&fm=jpg",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80&fm=jpg",
    ],
  },
];

for (const example of examples) {
  const { photos, ...fields } = example;
  const { data: existing, error: lookupError } = await supabase.from("properties").select("id, agent_id, is_demo").eq("slug", fields.slug).maybeSingle();
  if (lookupError) throw new Error(`Could not check ${fields.slug}: ${lookupError.message}`);
  if (existing && (existing.agent_id !== agentId || !existing.is_demo)) {
    throw new Error(`Refusing to overwrite non-demo listing ${fields.slug}.`);
  }
  const { data: property, error: propertyError } = await supabase.from("properties").upsert({
    ...fields,
    agent_id: agentId,
    currency: "NGN",
    status: "inactive",
    is_demo: true,
  }, { onConflict: "slug" }).select("id").single();
  if (propertyError || !property) throw new Error(`Could not prepare ${fields.slug}: ${propertyError?.message ?? "unknown database error"}`);

  const paths = [];
  for (const [index, photoUrl] of photos.entries()) {
    const response = await fetch(photoUrl);
    if (!response.ok) throw new Error(`Could not download the demo photograph (${response.status}).`);
    const type = response.headers.get("content-type")?.split(";")[0];
    if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") {
      throw new Error(`Unexpected image type from demo photograph source: ${type ?? "missing content type"}.`);
    }
    const contents = Buffer.from(await response.arrayBuffer());
    if (contents.length > 6 * 1024 * 1024) throw new Error("A demo photograph exceeds the 6 MB limit.");
    const path = `${agentId}/${property.id}/demo-${index + 1}.jpg`;
    const { error: uploadError } = await supabase.storage.from("property-media").upload(path, contents, {
      contentType: type,
      upsert: true,
    });
    if (uploadError) throw new Error(`Could not upload demo media: ${uploadError.message}`);
    paths.push(path);

    const { error: imageError } = await supabase.from("property_images").upsert({
      property_id: property.id,
      storage_path: path,
      alt_text: `Demo photograph ${index + 1} for ${fields.title}`,
      sort_order: index,
    }, { onConflict: "storage_path" });
    if (imageError) throw new Error(`Could not save demo image metadata: ${imageError.message}`);
  }

  const { error: publishError } = await supabase.from("properties").update({ status: "published" }).eq("id", property.id);
  if (publishError) throw new Error(`Could not publish demo listing: ${publishError.message}`);
}

console.log("Development demo listings are ready. They are marked as demo and should be replaced before launch.");
