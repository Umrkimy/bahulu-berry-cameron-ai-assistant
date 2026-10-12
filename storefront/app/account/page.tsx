import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountPage } from "../_components/account-page";
import { isAccountsEnabled } from "../_lib/accounts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default function Account() {
  if (!isAccountsEnabled()) notFound();
  return <AccountPage />;
}
