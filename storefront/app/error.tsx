"use client";

import { StorefrontState } from "./_components/storefront-state";

export default function ErrorPage() {
  return <StorefrontState kind="error" retry={() => window.location.reload()} />;
}
