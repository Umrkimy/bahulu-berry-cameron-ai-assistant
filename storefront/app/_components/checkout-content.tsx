"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { cartCopy } from "../_lib/cart-copy";
import {
  checkoutFailure, checkoutPayload, emptyContact, errorsForStep, firstStepWithErrors, idempotencyKeyFor, MALAYSIAN_STATES, PENDING_CHECKOUT_KEY, safePaymentUrl, serverFieldErrors, validateCheckout,
  type CheckoutContact, type CheckoutErrors, type CheckoutFailure, type CheckoutField, type CheckoutResult, type CheckoutStatus, type CheckoutStep,
} from "../_lib/checkout";
import { money } from "../_lib/content";
import type { StorefrontQuote } from "../_lib/types";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";
import { ProductArtwork } from "./product-artwork";
import { useCartQuote } from "./use-cart-quote";

type Copy = (typeof cartCopy)["en"] | (typeof cartCopy)["ms"];

export function CheckoutContent({ status }: { status: CheckoutStatus }) {
  const { locale } = useLocale();
  const { items, hydrated } = useCart();
  const { quote, state, retry } = useCartQuote();
  const text = cartCopy[locale];
  const live = status.enabled;

  return <div className="checkout-concept"><section className="cart-hero checkout-hero"><div className="shell"><h1>{live ? text.checkoutTitle : text.previewTitle}</h1><p>{live ? text.checkoutIntro : text.previewIntro}</p></div></section><section className="shell checkout-content">
    {live && status.test_mode ? <p className="checkout-test-note" role="note"><strong>{text.testMode}</strong> <span>{text.testModeBody}</span></p> : null}
    {!live ? <div className="preview-warning" role="note"><strong>{text.fictional}</strong><p>{text.fictionalBody}</p></div> : null}
    {!hydrated || (state === "loading" && !quote) ? <p className="cart-status" role="status">{text.loading}</p> : null}
    {state === "error" ? <div className="cart-error" role="alert"><p>{text.error}</p><button type="button" className="home-text-link" onClick={retry}>{text.retry}</button></div> : null}
    {hydrated && items.length === 0 ? <div className="cart-empty"><h2>{text.empty}</h2><Link href="/products" className="home-button">{text.browse}</Link></div> : null}
    {quote && items.length > 0 ? live ? <div className="checkout-layout">
      <CheckoutForm quote={quote} text={text} locale={locale} />
      <OrderSummary quote={quote} text={text} locale={locale} />
    </div> : <div className="checkout-grid">
      <OrderSummary quote={quote} text={text} locale={locale} />
      <section className="checkout-panel"><h2>{text.fulfilment}</h2><p>{text.fulfilmentBody}</p></section>
      <section className="checkout-panel"><h2>{text.payment}</h2><p>{text.paymentBody}</p><button type="button" disabled className="home-button">{text.noSubmission}</button></section>
    </div> : null}
    <Link href="/cart" className="home-text-link checkout-back"><span aria-hidden="true">←</span>{text.backCart}</Link>
  </section></div>;
}

function OrderSummary({ quote, text, locale }: { quote: StorefrontQuote; text: Copy; locale: "en" | "ms" }) {
  const hasDiscount = Number(quote.discount_amount ?? 0) > 0;
  return <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
    <h2 id="checkout-summary-title">{text.orderSummary}</h2>
    <ul className="checkout-items">{quote.items.map((line) => {
      const name = (locale === "ms" ? line.name_ms : line.name_en) ?? `Product #${line.product_id}`;
      return <li key={line.product_id}>
        <span className="checkout-item-image"><ProductArtwork imagePath={line.image_path} name={name} /><span className="checkout-item-count" aria-hidden="true">{line.quantity}</span></span>
        <span className="checkout-item-name">{name}<span className="sr-only">, {text.quantity} {line.quantity}</span></span>
        <strong>{line.total_amount ? money(line.total_amount) : "—"}</strong>
      </li>;
    })}</ul>
    {quote.ready && quote.total_amount ? <dl className="checkout-totals">
      {hasDiscount && quote.subtotal ? <div><dt>{text.subtotal}</dt><dd>{money(quote.subtotal)}</dd></div> : null}
      {hasDiscount && quote.discount_amount ? <div className="cart-discount"><dt>{text.discount}</dt><dd>− {money(quote.discount_amount)}</dd></div> : null}
      <div className="checkout-total"><dt>{text.total}</dt><dd>{money(quote.total_amount)}</dd></div>
    </dl> : <p className="cart-line-warning">{text.quantityUnavailable}</p>}
  </aside>;
}

function fieldMessage(field: CheckoutField, kind: "required" | "invalid", text: Copy): string {
  if (field === "privacy") return text.privacyRequired;
  if (kind === "required") return text.fieldRequired;
  return {
    full_name: text.nameInvalid, phone_number: text.phoneInvalid, email: text.emailInvalid, address: text.addressInvalid,
    postal_code: text.postcodeInvalid, city: text.fieldRequired, state: text.fieldRequired,
  }[field];
}

function fieldLabel(field: CheckoutField, text: Copy): string {
  return {
    full_name: text.fullName, phone_number: text.phone, email: text.email, address: text.address,
    city: text.city, state: text.state, postal_code: text.postcode, privacy: text.privacyShort,
  }[field];
}

function failureMessage(failure: CheckoutFailure, text: Copy): string {
  return {
    unavailable: text.failUnavailable, changed: text.failChanged, closed: text.failClosed, contact: text.failContact,
    payment: text.failPayment, invalid: text.failInvalid, busy: text.failBusy, network: text.failNetwork,
  }[failure];
}

function CheckoutForm({ quote, text, locale }: { quote: StorefrontQuote; text: Copy; locale: "en" | "ms" }) {
  const { items } = useCart();
  const [contact, setContact] = useState<CheckoutContact>(emptyContact);
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [failure, setFailure] = useState<CheckoutFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<CheckoutStep>(1);
  const [completed, setCompleted] = useState<ReadonlySet<CheckoutStep>>(new Set());
  const lastRequest = useRef<{ body: string; key: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  // Opening a step moves focus to its heading, after React has rendered it.
  // An error summary focused later in the same frame takes precedence.
  const openStep = (next: CheckoutStep) => {
    setStep(next);
    requestAnimationFrame(() => document.getElementById(`${formId}-step-${next}`)?.focus());
  };

  const showErrors = (found: CheckoutErrors) => {
    setErrors(found);
    const target = firstStepWithErrors(found);
    if (target && target !== step) openStep(target);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const update = (field: keyof CheckoutContact) => (value: string) => {
    setContact((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const advance = () => {
    const found = errorsForStep(validateCheckout(contact, privacy), step);
    if (Object.keys(found).length) { showErrors(found); return; }
    setErrors({});
    const done = new Set(completed).add(step);
    setCompleted(done);
    // Skip steps already filled in, e.g. after editing step 1 from the review.
    const next = ([2, 3] as const).find((candidate) => candidate > step && !done.has(candidate)) ?? 3;
    openStep(next);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    // Enter inside an earlier step moves the customer forward instead of paying.
    if (step < 3) { advance(); return; }
    setFailure(null);
    const found = validateCheckout(contact, privacy);
    if (Object.keys(found).length) { showErrors(found); return; }
    setErrors({});

    const body = JSON.stringify(checkoutPayload(items, contact, locale));
    lastRequest.current = idempotencyKeyFor(body, lastRequest.current, () => crypto.randomUUID());
    setSubmitting(true);
    try {
      const response = await fetch("/storefront-data/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": lastRequest.current.key },
        body,
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as Partial<CheckoutResult> & { detail?: { code?: string } | string | unknown[] };
      const paymentUrl = response.ok ? safePaymentUrl(payload.payment_url) : null;
      const fieldErrors = response.status === 422 ? serverFieldErrors(payload.detail) : {};
      if (Object.keys(fieldErrors).length) {
        setSubmitting(false);
        showErrors(fieldErrors);
        return;
      }
      if (!paymentUrl) {
        const code = payload.detail && typeof payload.detail === "object" && !Array.isArray(payload.detail) ? payload.detail.code : undefined;
        setFailure(checkoutFailure(response.ok ? 500 : response.status, code));
        setSubmitting(false);
        return;
      }
      try { sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ orderNumber: payload.order_number, trackingToken: payload.tracking_token })); } catch { /* optional */ }
      window.location.assign(paymentUrl);
    } catch {
      setFailure("network");
      setSubmitting(false);
    }
  }

  const stepErrors = Object.entries(errorsForStep(errors, step)).filter(([, kind]) => kind) as [CheckoutField, "required" | "invalid"][];
  const errorSummary = stepErrors.length ? <div ref={summaryRef} tabIndex={-1} className="cart-error checkout-error-summary" role="alert"><p>{text.errorSummary}</p><ul>{stepErrors.map(([name, kind]) => <li key={name}><a href={`#${formId}-${name}`}>{fieldLabel(name, text)}: {fieldMessage(name, kind, text)}</a></li>)}</ul></div> : null;

  const field = (name: keyof CheckoutContact, label: string, input: (props: FieldProps) => ReactNode, hint?: string) => {
    const id = `${formId}-${name}`;
    const error = errors[name];
    const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
    return <div className="checkout-field" data-invalid={error ? "" : undefined}>
      <label htmlFor={id}>{label}</label>
      {input({ id, value: contact[name], onChange: update(name), invalid: Boolean(error), describedBy })}
      {hint ? <p id={`${id}-hint`} className="checkout-hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="checkout-error">{fieldMessage(name, error, text)}</p> : null}
    </div>;
  };

  const stepProps = (index: CheckoutStep, title: string) => ({
    index, title, text, formId,
    state: (index === step ? "open" : completed.has(index) ? "done" : "locked") as StepState,
    onEdit: () => { setErrors({}); openStep(index); },
  });

  const cityLine = [contact.city.trim(), contact.postal_code.trim()].filter(Boolean).join(" ");

  return <form className="checkout-form" onSubmit={submit} noValidate aria-busy={submitting}>
    {failure ? <div className="cart-error" role="alert"><p>{failureMessage(failure, text)}</p>{failure === "unavailable" || failure === "closed" ? <Link href="/cart" className="home-text-link">{text.backCart}</Link> : null}</div> : null}

    <CheckoutStepPanel {...stepProps(1, text.yourDetails)} summary={<>
      <p>{contact.full_name.trim()}</p><p>{contact.phone_number.trim()}</p><p>{contact.email.trim() || text.noEmail}</p>
    </>}>
      {errorSummary}
      {field("full_name", text.fullName, (props) => <TextInput {...props} autoComplete="name" />)}
      {field("phone_number", text.phone, (props) => <TextInput {...props} type="tel" autoComplete="tel" inputMode="tel" />, text.phoneHint)}
      {field("email", text.email, (props) => <TextInput {...props} type="email" autoComplete="email" />, text.emailHint)}
      <button type="button" className="home-button checkout-next" onClick={advance}>{text.continueToAddress}</button>
    </CheckoutStepPanel>

    <CheckoutStepPanel {...stepProps(2, text.deliveryAddress)} summary={<>
      <p>{contact.address.trim()}</p><p>{cityLine}</p><p>{contact.state}</p>
    </>}>
      {errorSummary}
      {field("address", text.address, (props) => <TextInput {...props} autoComplete="street-address" />)}
      <div className="checkout-row">
        {field("city", text.city, (props) => <TextInput {...props} autoComplete="address-level2" />)}
        {field("postal_code", text.postcode, (props) => <TextInput {...props} autoComplete="postal-code" inputMode="numeric" maxLength={5} />)}
      </div>
      {field("state", text.state, ({ id, value, onChange, invalid, describedBy }) => <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} aria-describedby={describedBy} autoComplete="address-level1" required>
        <option value="">{text.statePlaceholder}</option>
        {MALAYSIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
      </select>)}
      <button type="button" className="home-button checkout-next" onClick={advance}>{text.continueToReview}</button>
    </CheckoutStepPanel>

    <CheckoutStepPanel {...stepProps(3, text.reviewPay)}>
      {errorSummary}
      <dl className="checkout-review">
        <div><dt>{text.contactFor}</dt><dd>{contact.full_name.trim()} · {contact.phone_number.trim()}</dd></div>
        <div><dt>{text.deliverTo}</dt><dd>{[contact.address.trim(), cityLine, contact.state].filter(Boolean).join(", ")}</dd></div>
        {quote.ready && quote.total_amount ? <div className="checkout-review-total"><dt>{text.total}</dt><dd>{money(quote.total_amount)}</dd></div> : null}
      </dl>
      <div className="checkout-consent" data-invalid={errors.privacy ? "" : undefined}>
        <input id={`${formId}-privacy`} type="checkbox" checked={privacy} onChange={(event) => { setPrivacy(event.target.checked); setErrors((current) => ({ ...current, privacy: undefined })); }} aria-invalid={Boolean(errors.privacy) || undefined} aria-describedby={errors.privacy ? `${formId}-privacy-error` : undefined} />
        <label htmlFor={`${formId}-privacy`}>{text.privacy}</label>
        {errors.privacy ? <p id={`${formId}-privacy-error`} className="checkout-error">{text.privacyRequired}</p> : null}
      </div>
      <button type="submit" className="home-button checkout-submit" disabled={!quote.ready || submitting}>{submitting ? text.paying : text.payNow}</button>
    </CheckoutStepPanel>
  </form>;
}

type StepState = "open" | "done" | "locked";

function CheckoutStepPanel({ index, title, state, text, formId, onEdit, summary, children }: {
  index: CheckoutStep; title: string; state: StepState; text: Copy; formId: string;
  onEdit: () => void; summary?: ReactNode; children: ReactNode;
}) {
  const headingId = `${formId}-step-${index}`;
  return <section className="checkout-step" data-state={state} aria-labelledby={headingId}>
    <div className="checkout-step-head">
      <h2 id={headingId} tabIndex={-1}>
        <span className="checkout-step-marker" aria-hidden="true">{state === "done" ? <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" /></svg> : index}</span>
        <span className="sr-only">{text.step} {index}: </span>{title}{state === "done" ? <span className="sr-only">, {text.stepDone}</span> : null}
      </h2>
      {state === "done" ? <button type="button" className="checkout-edit" onClick={onEdit} aria-label={`${text.edit}: ${title}`}>{text.edit}</button> : null}
    </div>
    {state === "open" ? <div className="checkout-step-body">{children}</div> : null}
    {state === "done" && summary ? <div className="checkout-step-summary">{summary}</div> : null}
  </section>;
}

type FieldProps = { id: string; value: string; onChange: (value: string) => void; invalid: boolean; describedBy?: string };

function TextInput({ id, value, onChange, invalid, describedBy, ...rest }: FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} aria-describedby={describedBy} {...rest} />;
}
