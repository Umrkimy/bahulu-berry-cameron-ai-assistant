import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PolicyPage } from "../../_components/policy-page";
import { showDraftContent } from "../../_lib/draft-content";
import { findPolicy } from "../../_lib/policies";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = findPolicy((await params).slug);
  return { title: policy?.title.en ?? "Not found", robots: { index: false, follow: false } };
}

export default async function Page({ params }: Props) {
  const policy = findPolicy((await params).slug);
  // Draft policies stay hidden until the client approves them.
  if (!policy || !showDraftContent()) notFound();
  return <PolicyPage slug={policy.slug} />;
}
