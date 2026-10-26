"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PropertyCard } from "@/components/property-card";
import type { Property } from "@/lib/properties";
import { categoryLabels } from "@/lib/properties";

type Props = { properties: Property[]; initialQuery: string; initialCategory: string; initialType: string; initialCurrency: string; initialMinPrice: string; initialMaxPrice: string };

export function PropertyDirectory({ properties, initialQuery, initialCategory, initialType, initialCurrency, initialMinPrice, initialMaxPrice }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState(initialType);
  const [currency, setCurrency] = useState(initialCurrency);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [bedrooms, setBedrooms] = useState("");
  const [sort, setSort] = useState("newest");
  const [results, setResults] = useState(properties);
  const [resultCount, setResultCount] = useState(properties.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (currency) params.set("currency", currency);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (sort !== "newest") params.set("sort", sort);
    return params.toString();
  }, [query, category, type, currency, minPrice, maxPrice, bedrooms, sort]);
  const latestSearchParams = useRef(searchParams);

  useEffect(() => {
    latestSearchParams.current = searchParams;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/properties?${searchParams}`, { signal: controller.signal, cache: "no-store" });
        const result: { properties?: Property[]; count?: number; error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load properties.");
        setResults(result.properties ?? []);
        setResultCount(result.count ?? 0);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load properties.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchParams]);

  async function loadMore() {
    if (loadingMore || results.length >= resultCount) return;
    const requestedSearch = searchParams;
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams(requestedSearch);
      params.set("offset", String(results.length));
      const response = await fetch(`/api/properties?${params}`, { cache: "no-store" });
      const result: { properties?: Property[]; count?: number; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load more properties.");
      if (requestedSearch !== latestSearchParams.current) return;
      setResults((current) => [...current, ...(result.properties ?? [])]);
      setResultCount(result.count ?? 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load more properties.");
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = results;

  return (
    <div className="directory-layout">
      <aside className="filter-panel" aria-label="Property filters">
        <h2>Refine your search</h2>
        <label>Search
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="City, title or keyword" />
        </label>
        <label>Property category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Listing type
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Buy or rent</option>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
        </label>
        <label>Currency
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="">All currencies</option><option value="NGN">NGN</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select>
        </label>
        <label>Minimum price<input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="No minimum" /></label>
        <label>Maximum price<input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No maximum" /></label>
        <label>Bedrooms
          <select value={bedrooms} onChange={(event) => setBedrooms(event.target.value)}><option value="">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select>
        </label>
        <button className="filter-reset" type="button" onClick={() => { setQuery(""); setCategory(""); setType(""); setCurrency("NGN"); setMinPrice(""); setMaxPrice(""); setBedrooms(""); setSort("newest"); }}>Clear filters</button>
      </aside>
      <div className="directory-results">
        <div className="results-toolbar">
          <p><strong>{resultCount}</strong> {resultCount === 1 ? "property" : "properties"} found</p>
          <label>Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
        </div>
        {error && <p className="form-alert" role="alert">{error}</p>}
        {loading && <p className="directory-loading" role="status">Searching available properties…</p>}
        {filtered.length ? <div className="property-grid">{filtered.map((property) => <PropertyCard key={property.id} property={property} />)}</div> : !loading && (
          <div className="empty-state"><h3>No properties match those filters.</h3><p>Try another location or clear some filters.</p><button className="button button-dark" type="button" onClick={() => { setQuery(""); setCategory(""); setType(""); setCurrency("NGN"); setMinPrice(""); setMaxPrice(""); setBedrooms(""); setSort("newest"); }}>Clear filters</button></div>
        )}
        {results.length < resultCount && <button className="button button-dark load-more-button" type="button" onClick={loadMore} disabled={loadingMore || loading}>{loadingMore ? "Loading more…" : "Load more properties"} <span aria-hidden="true">↓</span></button>}
      </div>
    </div>
  );
}
