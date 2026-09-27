import api from "./axios";

export interface BilingualText { en: string; ms: string }
export interface HomepageContent {
  hero: { eyebrow: BilingualText; title_primary: BilingualText; title_accent: BilingualText; title_suffix: BilingualText; body: BilingualText; cta_label: BilingualText };
  benefits: { enabled: boolean; eyebrow: BilingualText; title: BilingualText; items: { title: BilingualText; body: BilingualText }[] };
  collection: { eyebrow: BilingualText; title: BilingualText; view_all_label: BilingualText };
  story: { eyebrow: BilingualText; title: BilingualText; body: BilingualText; cta_label: BilingualText };
  reviews: { enabled: boolean; eyebrow: BilingualText; title: BilingualText };
  location: { enabled: boolean; eyebrow: BilingualText; title: BilingualText; load_map_label: BilingualText; directions_label: BilingualText };
  closing: { eyebrow: BilingualText; title: BilingualText; body: BilingualText; cta_label: BilingualText };
  google_place_id: string | null;
}

export interface GoogleReadiness {
  integrations_enabled: boolean;
  places_key_configured: boolean;
  maps_embed_key_configured: boolean;
  place_id_configured: boolean;
  ready_for_reviews: boolean;
  ready_for_map: boolean;
}

export interface HomepageAdminResponse {
  draft: HomepageContent;
  published: HomepageContent;
  draft_version: number;
  published_version: number;
  updated_at: string | null;
  published_at: string | null;
  google_readiness: GoogleReadiness;
}

export async function getStorefrontHomepage() {
  return (await api.get<HomepageAdminResponse>("/settings/storefront-homepage")).data;
}

export async function saveStorefrontHomepageDraft(expectedVersion: number, content: HomepageContent) {
  return (await api.put<HomepageAdminResponse>("/settings/storefront-homepage/draft", { expected_version: expectedVersion, content })).data;
}

export async function publishStorefrontHomepage(expectedDraftVersion: number) {
  return (await api.post<HomepageAdminResponse>("/settings/storefront-homepage/publish", { expected_draft_version: expectedDraftVersion })).data;
}

export async function checkStorefrontGoogleReadiness() {
  return (await api.post<{ ready: boolean; message: string }>("/settings/storefront-homepage/google-check")).data;
}
