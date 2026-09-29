"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { cartCopy } from "../_lib/cart-copy";
import {
  checkoutFailure, checkoutPayload, emptyContact, idempotencyKeyFor, MALAYSIAN_STATES, PENDING_CHECKOUT_KEY, safePaymentUrl, serverFieldErrors, validateCheckout,
  type CheckoutContact, type CheckoutErrors, type CheckoutFailure, type CheckoutField, type CheckoutResult, type CheckoutStatus,
} from "../_lib/checkout";
import { money } from "../_lib/content";
import type { StorefrontQuote } from "../_lib/types";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";
import { useCartQuote } from "./use-cart-quote";

type Copy = (typeof cartCopy)["en"] | (typeof cartCopy)["ms"];

export function CheckoutContent({ status }: { status: CheckoutStatus }) {
  const { locale } = useLocale();
  const { items, hydrated } = useCart();
  const { quote, state, retry } = useCartQuote();
  const text = cartCopy[locale];
  const live = status.enabled;

  return <div className="checkout-concept"><section className="cart-hero"><div className="shell"><h1>{live ? text.checkoutTitle : text.previewTitle}</h1><p>{live ? text.checkoutIntro : text.previewIntro}</p></div></section><section className="shell checkout-content">
    {live && status.test_mode ? <div className="preview-warning" role="note"><strong>{text.testMode}</strong><p>{text.testModeBody}</p></div> : null}
    {!live ? <div className="preview-warning" role="note"><strong>{text.fictional}</strong><p>{text.fictionalBody}</p></div> : null}
    {!hydrated || state === "loading" ? <p className="cart-status" role="status">{text.loading}</p> : null}
    {state === "error" ? <div className="cart-error" role="alert"><p>{text.error}</p><button type="button" className="home-text-link" onClick={retry}>{text.retry}</button></div> : null}
    {hydrated && items.length === 0 ? <div className="cart-empty"><h2>{text.empty}</h2><Link href="/products" className="home-button">{text.browse}</Link></div> : null}
    {quote ? <div className={live ? "checkout-grid checkout-grid-live" : "checkout-grid"}>
      <OrderSummary quote={quote} text={text} locale={locale} />
      {live ? <CheckoutForm ready={quote.ready} text={text} locale={locale} /> : <>
        <section className="checkout-panel"><h2>{text.fulfilment}</h2><p>{text.fulfilmentBody}</p></section>
        <section className="checkout-panel"><h2>{text.payment}</h2><p>{text.paymentBody}</p><button type="button" disabled className="home-button">{text.noSubmission}</button></section>
      </>}
    </div> : null}
    <Link href="/cart" className="home-text-link checkout-back">{text.backCart}</Link>
  </section></div>;
}

function OrderSummary({ quote, text, locale }: { quote: StorefrontQuote; text: Copy; locale: "en" | "ms" }) {
  return <section className="checkout-panel"><h2>{text.orderSummary}</h2><ul className="checkout-items">{quote.items.map((line) => <li key={line.product_id}><span>{(locale === "ms" ? line.name_ms : line.name_en) ?? `Product #${line.product_id}`} × {line.quantity}</span><strong>{line.total_amount ? money(line.total_amount) : "—"}</strong></li>)}</ul>{quote.ready && quote.total_amount ? <p className="checkout-total"><span>{text.total}</span><strong>{money(quote.total_amount)}</strong></p> : <p className="cart-line-warning">{text.quantityUnavailable}</p>}</section>;
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

function CheckoutForm({ ready, text, locale }: { ready: boolean; text: Copy; locale: "en" | "ms" }) {
  const { items } = useCart();
  const [contact, setContact] = useState<CheckoutContact>(emptyContact);
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [failure, setFailure] = useState<CheckoutFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastRequest = useRef<{ body: string; key: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const update = (field: keyof CheckoutContact) => (value: string) => {
    setContact((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFailure(null);
    const found = validateCheckout(contact, privacy);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

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
        setErrors(fieldErrors);
        setSubmitting(false);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      if (!paymentUrl) {
        const code = payload.detail && typeof payload.detail === "object" && !Array.isArray(payload.detail) ? payload.detail.code : undefined;
        setFailure(checkoutFailure(response.ok ? 500 : response.status, code));
        setSubmitting(false);
        return;
      }
      try { sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ orderNumber: payload.order_number })); } catch { /* optional */ }
      window.location.assign(paymentUrl);
    } catch {
      setFailure("network");
      setSubmitting(false);
    }
  }

  const errorEntries = Object.entries(errors).filter(([, kind]) => kind) as [CheckoutField, "required" | "invalid"][];
  const field = (name: keyof CheckoutContact, label: string, input: (props: FieldProps) => ReactNode, hint?: string) => {
    const id = `${formId}-${name}`;
    const error = errors[name];
    const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
    return <div className="checkout-field" data-invalid={error ? "" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p id={`${id}-hint`} className="checkout-hint">{hint}</p> : null}
      {input({ id, value: contact[name], onChange: update(name), invalid: Boolean(error), describedBy })}
      {error ? <p id={`${id}-error`} className="checkout-error">{fieldMessage(name, error, text)}</p> : null}
    </div>;
  };

  return <form className="checkout-panel checkout-form" onSubmit={submit} noValidate aria-busy={submitting}>
    {errorEntries.length ? <div ref={summaryRef} tabIndex={-1} className="cart-error" role="alert"><p>{text.errorSummary}</p><ul>{errorEntries.map(([name, kind]) => <li key={name}><a href={`#${formId}-${name}`}>{fieldLabel(name, text)}: {fieldMessage(name, kind, text)}</a></li>)}</ul></div> : null}
    {failure ? <div className="cart-error" role="alert"><p>{failureMessage(failure, text)}</p>{failure === "unavailable" || failure === "closed" ? <Link href="/cart" className="home-text-link">{text.backCart}</Link> : null}</div> : null}

    <fieldset><legend>{text.yourDetails}</legend>
      {field("full_name", text.fullName, (props) => <TextInput {...props} autoComplete="name" />)}
      {field("phone_number", text.phone, (props) => <TextInput {...props} type="tel" autoComplete="tel" inputMode="tel" />, text.phoneHint)}
      {field("email", text.email, (props) => <TextInput {...props} type="email" autoComplete="email" />, text.emailHint)}
    </fieldset>

    <fieldset><legend>{text.deliveryAddress}</legend>
      {field("address", text.address, (props) => <TextInput {...props} autoComplete="street-address" />)}
      <div className="checkout-row">
        {field("city", text.city, (props) => <TextInput {...props} autoComplete="address-level2" />)}
        {field("postal_code", text.postcode, (props) => <TextInput {...props} autoComplete="postal-code" inputMode="numeric" maxLength={5} />)}
      </div>
      {field("state", text.state, ({ id, value, onChange, invalid, describedBy }) => <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} aria-describedby={describedBy} autoComplete="address-level1" required>
        <option value="">{text.statePlaceholder}</option>
        {MALAYSIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
      </select>)}
    </fieldset>

    <div className="checkout-consent" data-invalid={errors.privacy ? "" : undefined}>
      <input id={`${formId}-privacy`} type="checkbox" checked={privacy} onChange={(event) => { setPrivacy(event.target.checked); setErrors((current) => ({ ...current, privacy: undefined })); }} aria-invalid={Boolean(errors.privacy) || undefined} aria-describedby={errors.privacy ? `${formId}-privacy-error` : undefined} />
      <label htmlFor={`${formId}-privacy`}>{text.privacy}</label>
      {errors.privacy ? <p id={`${formId}-privacy-error`} className="checkout-error">{text.privacyRequired}</p> : null}
    </div>

    <button type="submit" className="home-button checkout-submit" disabled={!ready || submitting}>{submitting ? text.paying : text.payNow}</button>
  </form>;
}

type FieldProps = { id: string; value: string; onChange: (value: string) => void; invalid: boolean; describedBy?: string };

function TextInput({ id, value, onChange, invalid, describedBy, ...rest }: FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} aria-describedby={describedBy} {...rest} />;
}
