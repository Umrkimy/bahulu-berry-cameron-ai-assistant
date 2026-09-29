"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";

import { money } from "../_lib/content";
import {
  lookupPayload, trackingDate, trackingStage, trackingSteps, validateLookup,
  type LookupErrors, type TrackedOrder,
} from "../_lib/order-tracking";
import { trackingCopy, type TrackingCopy } from "../_lib/tracking-copy";
import { useLocale } from "./locale-provider";

type TrackedOrderResult = { state: "found"; order: TrackedOrder } | { state: "missing" } | { state: "error" };

export function OrderTrackingPage({ result }: { result: TrackedOrderResult }) {
  const { locale } = useLocale();
  const text = trackingCopy[locale];
  return <Shell title={text.pageTitle}>
    {result.state === "found" ? <>
      <TrackedOrderView order={result.order} />
      <p className="tracking-note">{text.bookmark}</p>
    </> : result.state === "missing" ? <NotFound text={text} /> : <div className="cart-error" role="alert">
      <p>{text.failed}</p>
      <button type="button" className="home-text-link" onClick={() => window.location.reload()}>{text.tryAgain}</button>
    </div>}
  </Shell>;
}

function NotFound({ text }: { text: TrackingCopy }) {
  return <div className="tracking-missing" role="status">
    <h2>{text.notFoundTitle}</h2>
    <p>{text.notFound}</p>
    <Link href="/orders/find" className="home-button">{text.findTitle}</Link>
  </div>;
}

export function TrackedOrderView({ order }: { order: TrackedOrder }) {
  const { locale } = useLocale();
  const text = trackingCopy[locale];
  const stage = trackingStage(order);
  const steps = trackingSteps(order);
  const delivery = order.delivery;
  const tone = stage === "cancelled" || stage === "refunded" || stage === "deliveryFailed" ? "alert" : stage === "delivered" || stage === "completed" ? "done" : "active";

  return <article className="tracking-order" aria-labelledby="tracking-status">
    <header className="tracking-head">
      <p className="checkout-order-number"><span>{text.orderNumber}</span><strong>#{order.order_number}</strong></p>
      <h2 id="tracking-status" className="tracking-status" data-tone={tone}>{text.stage[stage]}</h2>
      <dl className="tracking-facts">
        <div><dt>{text.placedOn}</dt><dd>{trackingDate(order.created_at, locale)}</dd></div>
        {order.recipient_first_name ? <div><dt>{text.for}</dt><dd>{order.recipient_first_name}</dd></div> : null}
        {order.phone_last_digits ? <div><dt>{text.phoneEnding}</dt><dd>•••• {order.phone_last_digits}</dd></div> : null}
      </dl>
    </header>

    <section className="checkout-panel" aria-labelledby="tracking-timeline">
      <h3 id="tracking-timeline">{text.timeline}</h3>
      <ol className="tracking-steps">
        {steps.map((step) => <li key={step.key} data-done={step.done ? "" : undefined} data-alert={step.key === "failed" || step.key === "cancelled" ? "" : undefined}>
          <span className="tracking-dot" aria-hidden="true" />
          <span className="tracking-step-label">{text.step[step.key]}</span>
          <span className="tracking-step-meta">{step.at && step.done ? trackingDate(step.at, locale) : <span className="sr-only">{step.done ? text.stepDone : text.stepPending}</span>}</span>
        </li>)}
      </ol>
      {delivery?.courier || delivery?.tracking_number ? <dl className="tracking-facts tracking-courier">
        {delivery.courier ? <div><dt>{text.courier}</dt><dd>{delivery.courier}</dd></div> : null}
        {delivery.tracking_number ? <div><dt>{text.trackingNumber}</dt><dd className="tracking-number">{delivery.tracking_number}</dd></div> : null}
      </dl> : null}
    </section>

    <section className="checkout-panel" aria-labelledby="tracking-items">
      <h3 id="tracking-items">{text.items}</h3>
      <ul className="checkout-items">
        {order.items.map((item, index) => <li key={index}><span>{item.quantity} × {locale === "ms" ? item.name_ms : item.name_en}</span><span>{money(item.total_amount)}</span></li>)}
      </ul>
      {Number(order.discount_amount) > 0 ? <>
        <p className="tracking-line"><span>{text.subtotal}</span><span>{money(order.subtotal)}</span></p>
        <p className="tracking-line"><span>{text.discount}</span><span>−{money(order.discount_amount)}</span></p>
      </> : null}
      <p className="checkout-total"><span>{text.total}</span><strong>{money(order.total_amount)}</strong></p>
    </section>
    <p className="tracking-note">{text.help}</p>
  </article>;
}

export function FindOrder() {
  const { locale } = useLocale();
  const text = trackingCopy[locale];
  const formId = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<LookupErrors>({});
  const [failure, setFailure] = useState<"missing" | "busy" | "error" | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const found = validateLookup(orderNumber, phone);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/storefront-data/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lookupPayload(orderNumber, phone)),
        cache: "no-store",
      });
      if (response.ok) {
        setOrder(await response.json() as TrackedOrder);
        requestAnimationFrame(() => resultRef.current?.focus());
      } else {
        setFailure(response.status === 404 || response.status === 422 ? "missing" : response.status === 429 ? "busy" : "error");
      }
    } catch {
      setFailure("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (order) return <Shell title={text.findTitle}>
    <div ref={resultRef} tabIndex={-1} className="tracking-result"><TrackedOrderView order={order} /></div>
    <button type="button" className="home-text-link" onClick={() => { setOrder(null); setPhone(""); setOrderNumber(""); }}>{text.findAnother}</button>
  </Shell>;

  const message = (field: keyof LookupErrors) => errors[field] === "required" ? text.fieldRequired : field === "order_number" ? text.orderNumberInvalid : text.phoneInvalid;
  const errorEntries = (Object.keys(errors) as (keyof LookupErrors)[]).filter((field) => errors[field]);
  const field = (name: keyof LookupErrors, label: string, hint: string, value: string, onChange: (value: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement>) => {
    const id = `${formId}-${name}`;
    const describedBy = [`${id}-hint`, errors[name] ? `${id}-error` : ""].filter(Boolean).join(" ");
    return <div className="checkout-field" data-invalid={errors[name] ? "" : undefined}>
      <label htmlFor={id}>{label}</label>
      <p id={`${id}-hint`} className="checkout-hint">{hint}</p>
      <input id={id} value={value} onChange={(event) => { onChange(event.target.value); setErrors((current) => ({ ...current, [name]: undefined })); }} aria-invalid={Boolean(errors[name]) || undefined} aria-describedby={describedBy} {...extra} />
      {errors[name] ? <p id={`${id}-error`} className="checkout-error">{message(name)}</p> : null}
    </div>;
  };

  return <Shell title={text.findTitle} intro={text.findIntro}>
    <form className="checkout-panel checkout-form tracking-find" onSubmit={submit} noValidate aria-busy={submitting}>
      {errorEntries.length ? <div ref={summaryRef} tabIndex={-1} className="cart-error" role="alert"><p>{text.errorSummary}</p><ul>{errorEntries.map((name) => <li key={name}><a href={`#${formId}-${name}`}>{name === "order_number" ? text.orderNumber : text.phone}: {message(name)}</a></li>)}</ul></div> : null}
      {failure ? <div className="cart-error" role="alert"><p>{failure === "missing" ? text.notFound : failure === "busy" ? text.busy : text.failed}</p></div> : null}
      {field("order_number", text.orderNumber, text.orderNumberHint, orderNumber, setOrderNumber, { inputMode: "numeric", autoComplete: "off" })}
      {field("phone_number", text.phone, text.phoneHint, phone, setPhone, { type: "tel", inputMode: "tel", autoComplete: "tel" })}
      <button type="submit" className="home-button" disabled={submitting}>{submitting ? text.finding : text.find}</button>
    </form>
  </Shell>;
}

function Shell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return <div className="checkout-concept"><section className="cart-hero"><div className="shell"><h1>{title}</h1>{intro ? <p>{intro}</p> : null}</div></section>
    <section className="shell checkout-content tracking-content">{children}</section></div>;
}
