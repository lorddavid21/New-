"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const listingSchema = z.object({
  title: z.string().trim().min(8).max(140),
  category: z.enum(["house_land", "room", "commercial", "batch_sale"]),
  listing_type: z.enum(["sale", "rent"]),
  price: z.coerce.number().positive().max(1_000_000_000_000),
  currency: z.string().length(3).default("NGN"),
  short_description: z.string().trim().min(20).max(240),
  description: z.string().trim().min(40).max(6000),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(160),
  bedrooms: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]).optional(),
  bathrooms: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]).optional(),
  area_value: z.union([z.literal(""), z.coerce.number().positive().max(1_000_000)]).optional(),
  area_unit: z.string().max(16).optional(),
  video_url: z.union([
    z.literal(""),
    z.string().url().refine((value) => URL.canParse(value) && new URL(value).protocol === "https:", "Use a secure HTTPS video link."),
  ]).optional(),
  confirm_available: z.literal("yes"),
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 6 * 1024 * 1024;

async function requireActiveAgent() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).single();
  if (error || !profile || profile.account_status !== "active") return redirect("/login?error=disabled");
  return { supabase, user, profile };
}

async function cleanUpFailedListing(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, propertyId: string, mediaPaths: string[]) {
  const { error: propertyError } = await supabase.from("properties").delete().eq("id", propertyId);
  if (propertyError) {
    console.error("Failed to remove an incomplete property listing.", propertyError.message);
    return;
  }
  if (!mediaPaths.length) return;
  const { error: mediaError } = await supabase.storage.from("property-media").remove(mediaPaths);
  if (mediaError) console.error("Failed to remove media after an incomplete listing save.", mediaError.message);
}

export async function createListingAction(formData: FormData) {
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return redirect("/dashboard/properties/new?error=invalid");

  const photos = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (photos.length < 2 || photos.length > 8 || photos.some((file) => !allowedImageTypes.has(file.type) || file.size > maxImageBytes)) {
    return redirect("/dashboard/properties/new?error=photos");
  }
  const photoContents = await Promise.all(photos.map(async (file) => Buffer.from(await file.arrayBuffer())));
  const validSignatures = photos.every((file, index) => {
    const contents = photoContents[index];
    if (file.type === "image/jpeg") return contents.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (file.type === "image/png") return contents.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return contents.subarray(0, 4).toString("ascii") === "RIFF" && contents.subarray(8, 12).toString("ascii") === "WEBP";
  });
  if (!validSignatures) return redirect("/dashboard/properties/new?error=photos");

  const { supabase, user, profile } = await requireActiveAgent();
  if (profile.role !== "agent") return redirect("/admin");
  const details = parsed.data;
  const slug = `${details.title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90)}-${randomUUID().slice(0, 8)}`;
  const { data: property, error: propertyError } = await supabase.from("properties").insert({
    agent_id: user.id,
    slug,
    title: details.title,
    category: details.category,
    listing_type: details.listing_type,
    price: details.price,
    currency: details.currency.toUpperCase(),
    short_description: details.short_description,
    description: details.description,
    state: details.state,
    city: details.city,
    location: details.location,
    bedrooms: details.bedrooms === "" ? null : details.bedrooms ?? null,
    bathrooms: details.bathrooms === "" ? null : details.bathrooms ?? null,
    area_value: details.area_value === "" ? null : details.area_value ?? null,
    area_unit: details.area_unit || null,
    video_url: details.video_url || null,
    status: "inactive",
  }).select("id").single();

  if (propertyError || !property) return redirect("/dashboard/properties/new?error=save");

  const uploadedPaths: string[] = [];
  for (const [index, file] of photos.entries()) {
    const contents = photoContents[index];
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length);
    const path = `${user.id}/${property.id}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("property-media").upload(path, contents, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      await cleanUpFailedListing(supabase, property.id, uploadedPaths);
      return redirect("/dashboard/properties/new?error=upload");
    }
    uploadedPaths.push(path);
    const { error: imageError } = await supabase.from("property_images").insert({
      property_id: property.id,
      storage_path: path,
      alt_text: `${details.title} — image ${index + 1}`,
      sort_order: index,
    });
    if (imageError) {
      await cleanUpFailedListing(supabase, property.id, uploadedPaths);
      return redirect("/dashboard/properties/new?error=save");
    }
  }

  const { error: publishError } = await supabase.from("properties").update({ status: "published" }).eq("id", property.id).eq("agent_id", user.id);
  if (publishError) {
    await cleanUpFailedListing(supabase, property.id, uploadedPaths);
    return redirect("/dashboard/properties/new?error=publish");
  }

  revalidatePath("/");
  revalidatePath("/properties");
  redirect("/dashboard?notice=published");
}

export async function deleteListingAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return redirect("/dashboard?error=invalid");
  const { supabase, user, profile } = await requireActiveAgent();
  let query = supabase.from("properties").select("id, agent_id").eq("id", id.data);
  if (profile.role !== "admin") query = query.eq("agent_id", user.id);
  const { data: property, error: lookupError } = await query.single();
  if (lookupError || !property) return redirect("/dashboard?error=not-found");

  const { data: images, error: imagesError } = await supabase.from("property_images").select("storage_path").eq("property_id", property.id);
  if (imagesError) return redirect("/dashboard?error=delete");
  const { error: deleteError } = await supabase.from("properties").delete().eq("id", property.id);
  if (deleteError) return redirect("/dashboard?error=delete");
  if (images?.length) {
    const { error: storageError } = await supabase.storage.from("property-media").remove(images.map((image) => image.storage_path));
    if (storageError) return redirect("/dashboard?error=media-cleanup");
  }
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=deleted");
}

export async function setListingStatusAction(formData: FormData) {
  const values = z.object({ id: z.string().uuid(), status: z.enum(["published", "inactive", "sold", "rented"]) }).safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!values.success) return redirect("/dashboard?error=invalid");
  const { supabase, user, profile } = await requireActiveAgent();
  let query = supabase.from("properties").update({ status: values.data.status }).eq("id", values.data.id);
  if (profile.role !== "admin") query = query.eq("agent_id", user.id);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return redirect("/dashboard?error=update");
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  redirect("/dashboard?notice=updated");
}

export async function updateListingAction(formData: FormData) {
  const values = listingSchema.omit({ confirm_available: true }).safeParse(Object.fromEntries(formData));
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success || !values.success) {
    return redirect(`/dashboard/properties/${encodeURIComponent(String(formData.get("id") ?? ""))}/edit?error=invalid`);
  }

  const { supabase, user, profile } = await requireActiveAgent();
  let ownershipQuery = supabase.from("properties").select("id, agent_id").eq("id", id.data);
  if (profile.role !== "admin") ownershipQuery = ownershipQuery.eq("agent_id", user.id);
  const { data: property, error: ownershipError } = await ownershipQuery.maybeSingle();
  if (ownershipError || !property) return redirect("/dashboard?error=update");

  const removedIds = z.array(z.string().uuid()).safeParse(formData.getAll("remove_image_ids"));
  if (!removedIds.success || new Set(removedIds.data).size !== removedIds.data.length) {
    return redirect(`/dashboard/properties/${id.data}/edit?error=photos`);
  }
  const { data: existingImages, error: imagesError } = await supabase.from("property_images")
    .select("id, storage_path, sort_order").eq("property_id", id.data).order("sort_order");
  if (imagesError || !existingImages) return redirect(`/dashboard/properties/${id.data}/edit?error=save`);
  if (removedIds.data.some((imageId) => !existingImages.some((image) => image.id === imageId))) {
    return redirect(`/dashboard/properties/${id.data}/edit?error=photos`);
  }

  const removedSet = new Set(removedIds.data);
  const photos = formData.getAll("new_photos").filter((item): item is File => item instanceof File && item.size > 0);
  const keptImages = existingImages.filter((image) => !removedSet.has(image.id));
  if (keptImages.length + photos.length < 2 || keptImages.length + photos.length > 8 ||
    photos.some((file) => !allowedImageTypes.has(file.type) || file.size > maxImageBytes)) {
    return redirect(`/dashboard/properties/${id.data}/edit?error=photos`);
  }

  const photoContents = await Promise.all(photos.map(async (file) => Buffer.from(await file.arrayBuffer())));
  const validSignatures = photos.every((file, index) => {
    const contents = photoContents[index];
    if (file.type === "image/jpeg") return contents.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (file.type === "image/png") return contents.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return contents.subarray(0, 4).toString("ascii") === "RIFF" && contents.subarray(8, 12).toString("ascii") === "WEBP";
  });
  if (!validSignatures) return redirect(`/dashboard/properties/${id.data}/edit?error=photos`);

  const newPaths: string[] = [];
  const cleanupNewImages = async () => {
    if (!newPaths.length) return;
    const { error: metadataError } = await supabase.from("property_images")
      .delete().eq("property_id", id.data).in("storage_path", newPaths);
    if (metadataError) console.error("Failed to remove image metadata after an incomplete property edit.", metadataError.message);
    const { error: mediaError } = await supabase.storage.from("property-media").remove(newPaths);
    if (mediaError) console.error("Failed to remove uploaded images after an incomplete property edit.", mediaError.message);
  };

  for (const [index, file] of photos.entries()) {
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice("image/".length);
    const path = `${property.agent_id}/${id.data}/${randomUUID()}.${extension}`;
    newPaths.push(path);
    const { error: uploadError } = await supabase.storage.from("property-media").upload(path, photoContents[index], {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      await cleanupNewImages();
      return redirect(`/dashboard/properties/${id.data}/edit?error=upload`);
    }
    const { error: imageError } = await supabase.from("property_images").insert({
      property_id: id.data,
      storage_path: path,
      alt_text: `${values.data.title} — image ${keptImages.length + index + 1}`,
      sort_order: existingImages.reduce((max, image) => Math.max(max, image.sort_order), -1) + index + 1,
    });
    if (imageError) {
      await cleanupNewImages();
      return redirect(`/dashboard/properties/${id.data}/edit?error=upload`);
    }
  }

  let mediaCleanupFailed = false;
  if (removedIds.data.length) {
    const { error: removeError } = await supabase.from("property_images").delete()
      .eq("property_id", id.data).in("id", removedIds.data);
    if (removeError) {
      await cleanupNewImages();
      return redirect(`/dashboard/properties/${id.data}/edit?error=photos`);
    }
    const { error: storageError } = await supabase.storage.from("property-media").remove(
      existingImages.filter((image) => removedSet.has(image.id)).map((image) => image.storage_path),
    );
    if (storageError) {
      console.error("Failed to remove replaced property photographs.", storageError.message);
      mediaCleanupFailed = true;
    }
  }

  let updateQuery = supabase.from("properties").update({
    ...values.data,
    currency: values.data.currency.toUpperCase(),
    bedrooms: values.data.bedrooms === "" ? null : values.data.bedrooms ?? null,
    bathrooms: values.data.bathrooms === "" ? null : values.data.bathrooms ?? null,
    area_value: values.data.area_value === "" ? null : values.data.area_value ?? null,
    area_unit: values.data.area_unit || null,
    video_url: values.data.video_url || null,
  }).eq("id", id.data);
  if (profile.role !== "admin") updateQuery = updateQuery.eq("agent_id", user.id);
  const { data, error } = await updateQuery.select("slug").maybeSingle();
  if (error || !data) return redirect(`/dashboard/properties/${id.data}/edit?error=save`);
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath(`/properties/${data.slug}`);
  revalidatePath("/dashboard");
  redirect(mediaCleanupFailed ? "/dashboard?notice=updated&warning=media-cleanup" : "/dashboard?notice=updated");
}

export async function setAgentAccountAction(formData: FormData) {
  const values = z.object({
    userId: z.string().uuid(),
    status: z.enum(["active", "disabled"]),
  }).safeParse({
    userId: formData.get("user_id"),
    status: formData.get("status"),
  });
  if (!values.success) return redirect("/admin?error=invalid");
  const { supabase, profile } = await requireActiveAgent();
  if (profile.role !== "admin") return redirect("/dashboard");
  const { error } = await supabase.rpc("set_agent_status", {
    target_user_id: values.data.userId,
    new_status: values.data.status,
  });
  if (error) return redirect("/admin?error=agent");
  revalidatePath("/admin");
  redirect("/admin?notice=agent");
}
