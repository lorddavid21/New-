"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createListingAction, deleteListingAction, updateListingAction } from "@/app/listing-actions";
import type { Property } from "@/lib/properties";
import { categoryLabels } from "@/lib/properties";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button button-dark" type="submit" disabled={pending} aria-live="polite">{pending ? "Uploading images and publishing…" : "Publish property"} <span aria-hidden="true">↗</span></button>;
}

type SelectedPhoto = { file: File; previewUrl: string };

export function CreateListingForm({ error }: { error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function syncFiles(next: SelectedPhoto[]) {
    const nextUrls = new Set(next.map((photo) => photo.previewUrl));
    previewUrls.current.forEach((url) => {
      if (!nextUrls.has(url)) URL.revokeObjectURL(url);
    });
    previewUrls.current = [...nextUrls];
    setPhotos(next);
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    next.forEach(({ file }) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const newPhotos = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    const next = [...photos, ...newPhotos].slice(0, 8);
    newPhotos.slice(8 - photos.length).forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    syncFiles(next);
  }

  const message = error === "invalid" ? "Check the listing fields and try again." :
    error === "photos" ? "Choose between 2 and 8 JPEG, PNG or WebP images (up to 6 MB each)." :
    error === "upload" ? "An image could not be uploaded. No property was published; try again." :
    error === "save" ? "The property could not be saved. Please try again." : "";

  return (
    <form action={createListingAction} className="listing-form">
      {message && <p className="form-alert" role="alert">{message}</p>}
      <fieldset>
        <legend>Property details</legend>
        <label>Property title<input name="title" minLength={8} maxLength={140} placeholder="e.g. Modern family home in Lekki" required /></label>
        <div className="form-row">
          <label>Category<select name="category" defaultValue="house_land">{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Listing type<select name="listing_type" defaultValue="sale"><option value="sale">For sale</option><option value="rent">For rent</option></select></label>
        </div>
        <div className="form-row">
          <label>Price<input name="price" type="number" min="1" step="1" required /></label>
          <label>Currency<select name="currency" defaultValue="NGN"><option value="NGN">NGN — Nigerian naira</option><option value="USD">USD — US dollar</option><option value="GBP">GBP — Pound sterling</option><option value="EUR">EUR — Euro</option></select></label>
        </div>
        <label>Short description<input name="short_description" minLength={20} maxLength={240} placeholder="A concise introduction to your property" required /></label>
        <label>Full description<textarea name="description" rows={6} minLength={40} maxLength={6000} required /></label>
      </fieldset>
      <fieldset>
        <legend>Location & features</legend>
        <div className="form-row three">
          <label>State<input name="state" maxLength={80} required /></label>
          <label>City<input name="city" maxLength={80} required /></label>
          <label>Neighbourhood / address<input name="location" maxLength={160} required /></label>
        </div>
        <div className="form-row three">
          <label>Bedrooms<input name="bedrooms" type="number" min="0" max="100" /></label>
          <label>Bathrooms<input name="bathrooms" type="number" min="0" max="100" /></label>
          <label>Area<input name="area_value" type="number" min="0.01" step="any" /></label>
        </div>
        <label>Area unit<select name="area_unit" defaultValue=""><option value="">Not specified</option><option value="sqm">Square metres (sqm)</option><option value="sqft">Square feet (sq ft)</option><option value="acres">Acres</option><option value="hectares">Hectares</option></select></label>
        <label>Property video link (optional)<input name="video_url" type="url" inputMode="url" placeholder="https://…" /></label>
      </fieldset>
      <fieldset>
        <legend>Photographs</legend>
        <p className="form-helper">Add at least two images. JPEG, PNG and WebP files up to 6 MB each (8 images maximum).</p>
        <label className="photo-upload">Choose photographs<input ref={inputRef} type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required onChange={(event) => addPhotos(event.currentTarget.files)} /></label>
        <div className="photo-preview-grid">{photos.map((photo, index) => (
          <div className="photo-preview" key={`${photo.file.name}-${index}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.previewUrl} alt={`Selected image ${index + 1}: ${photo.file.name}`} />
            <div><span>{index + 1}. {photo.file.name}</span><button type="button" aria-label={`Remove ${photo.file.name}`} onClick={() => syncFiles(photos.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
              <button type="button" aria-label={`Move ${photo.file.name} earlier`} disabled={index === 0} onClick={() => { const next = [...photos]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; syncFiles(next); }}>↑</button>
              <button type="button" aria-label={`Move ${photo.file.name} later`} disabled={index === photos.length - 1} onClick={() => { const next = [...photos]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; syncFiles(next); }}>↓</button>
            </div>
          </div>
        ))}</div>
      </fieldset>
      <label className="availability-check"><input type="checkbox" name="confirm_available" value="yes" required /> I confirm this property is available and the details are accurate.</label>
      <SubmitButton />
    </form>
  );
}

export function DeleteListingForm({ property }: { property: Pick<Property, "id" | "title"> }) {
  return <form action={deleteListingAction} onSubmit={(event) => { if (!window.confirm(`Delete “${property.title}”? This cannot be undone.`)) event.preventDefault(); }}>
    <input type="hidden" name="id" value={property.id} />
    <button className="table-action danger-action" type="submit">Delete</button>
  </form>;
}

export function EditListingForm({ property, error }: { property: Property; error?: string }) {
  const message = error === "invalid" ? "Check the listing fields and try again."
    : error === "photos" ? "Keep at least two photographs and select only images belonging to this listing."
    : error === "upload" ? "A new photograph could not be uploaded. Please try again."
    : "We couldn't update this property. Please try again.";
  return (
    <form action={updateListingAction} className="listing-form">
      {error && <p className="form-alert" role="alert">{message}</p>}
      <input type="hidden" name="id" value={property.id} />
      <fieldset>
        <legend>Property details</legend>
        <label>Property title<input name="title" minLength={8} maxLength={140} defaultValue={property.title} required /></label>
        <div className="form-row">
          <label>Category<select name="category" defaultValue={property.category}>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Listing type<select name="listing_type" defaultValue={property.listing_type}><option value="sale">For sale</option><option value="rent">For rent</option></select></label>
        </div>
        <div className="form-row">
          <label>Price<input name="price" type="number" min="1" step="1" defaultValue={property.price} required /></label>
          <label>Currency<select name="currency" defaultValue={property.currency}><option value="NGN">NGN — Nigerian naira</option><option value="USD">USD — US dollar</option><option value="GBP">GBP — Pound sterling</option><option value="EUR">EUR — Euro</option></select></label>
        </div>
        <label>Short description<input name="short_description" minLength={20} maxLength={240} defaultValue={property.short_description} required /></label>
        <label>Full description<textarea name="description" rows={6} minLength={40} maxLength={6000} defaultValue={property.description} required /></label>
      </fieldset>
      <fieldset>
        <legend>Location & features</legend>
        <div className="form-row three">
          <label>State<input name="state" maxLength={80} defaultValue={property.state} required /></label>
          <label>City<input name="city" maxLength={80} defaultValue={property.city} required /></label>
          <label>Neighbourhood / address<input name="location" maxLength={160} defaultValue={property.location} required /></label>
        </div>
        <div className="form-row three">
          <label>Bedrooms<input name="bedrooms" type="number" min="0" max="100" defaultValue={property.bedrooms ?? ""} /></label>
          <label>Bathrooms<input name="bathrooms" type="number" min="0" max="100" defaultValue={property.bathrooms ?? ""} /></label>
          <label>Area<input name="area_value" type="number" min="0.01" step="any" defaultValue={property.area_value ?? ""} /></label>
        </div>
        <label>Area unit<select name="area_unit" defaultValue={property.area_unit ?? ""}><option value="">Not specified</option><option value="sqm">Square metres (sqm)</option><option value="sqft">Square feet (sq ft)</option><option value="acres">Acres</option><option value="hectares">Hectares</option></select></label>
        <label>Property video link (optional)<input name="video_url" type="url" inputMode="url" placeholder="https://…" defaultValue={property.video_url ?? ""} /></label>
      </fieldset>
      <fieldset>
        <legend>Photographs</legend>
        <p className="form-helper">Existing photographs remain unless you select them for removal. At least two photographs must remain after saving.</p>
        <div className="photo-preview-grid">{property.images.map((image, index) => (
          <div className="photo-preview" key={image.storage_path}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.storage_path} alt={image.alt_text ?? `${property.title} image ${index + 1}`} />
            <div><span>{index + 1}. Existing photograph</span></div>
            {image.id && <label className="remove-photo-check"><input type="checkbox" name="remove_image_ids" value={image.id} /> Remove this image</label>}
          </div>
        ))}</div>
        <label className="photo-upload">Add photographs (optional)<input type="file" name="new_photos" accept="image/jpeg,image/png,image/webp" multiple /></label>
        <p className="form-helper">JPEG, PNG or WebP files up to 6 MB each. Eight photographs maximum per property.</p>
      </fieldset>
      <button className="button button-dark" type="submit">Save changes <span aria-hidden="true">↗</span></button>
    </form>
  );
}
