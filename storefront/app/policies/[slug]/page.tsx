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
  if (!policy) notFound();
  // Draft wording stays hidden until the client approves it; the page then
  // only says the policy is being prepared.
  return <PolicyPage slug={policy.slug} showDraft={showDraftContent()} />;
}
