// Server-only switch for content the client has not confirmed yet (draft
// figures, FAQ answers, and policy pages). Off unless explicitly enabled.
export function showDraftContent(): boolean {
  return process.env.STOREFRONT_DRAFT_CONTENT === "true";
}
