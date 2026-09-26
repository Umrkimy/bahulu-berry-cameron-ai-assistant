export function isCheckoutPreviewEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return environment.STOREFRONT_CHECKOUT_PREVIEW_ENABLED === "true";
}
