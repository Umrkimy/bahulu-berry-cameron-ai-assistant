"use client";

import { useState } from "react";

import { MAX_CART_QUANTITY } from "../_lib/cart";
import { cartCopy } from "../_lib/cart-copy";
import { useLocale } from "./locale-provider";

// − [n] + control shared by the cart lines and the product page.
// Typed values commit on blur or Enter; out-of-range input shows a hint and
// falls back to the last good quantity.
export function QuantityStepper({ quantity, name, onChange, className }: { quantity: number; name: string; onChange: (quantity: number) => void; className?: string }) {
  const { locale } = useLocale();
  const text = cartCopy[locale];
  return <div className={`quantity-control${className ? ` ${className}` : ""}`} role="group" aria-label={`${text.quantity}: ${name}`}>
    <button type="button" disabled={quantity <= 1} onClick={() => onChange(quantity - 1)} aria-label={`${text.decrease}: ${name}`}><StepIcon /></button>
    <QuantityInput key={quantity} quantity={quantity} label={`${text.quantity}: ${name}`} rangeHint={`${text.quantityRange} ${MAX_CART_QUANTITY}.`} onCommit={onChange} />
    <button type="button" disabled={quantity >= MAX_CART_QUANTITY} onClick={() => onChange(quantity + 1)} aria-label={`${text.increase}: ${name}`}><StepIcon plus /></button>
  </div>;
}

function StepIcon({ plus = false }: { plus?: boolean }) {
  return <svg className="quantity-icon" viewBox="0 0 20 20" aria-hidden="true"><path d={plus ? "M4 10h12M10 4v12" : "M4 10h12"} /></svg>;
}

function QuantityInput({ quantity, label, rangeHint, onCommit }: { quantity: number; label: string; rangeHint: string; onCommit: (quantity: number) => void }) {
  const [draft, setDraft] = useState(String(quantity));
  const value = Number(draft);
  const valid = Number.isInteger(value) && value >= 1 && value <= MAX_CART_QUANTITY;
  const commit = () => {
    if (valid && value !== quantity) onCommit(value);
    else if (!valid) setDraft(String(quantity));
  };
  return <>
    <input type="number" inputMode="numeric" min="1" max={MAX_CART_QUANTITY} value={draft} aria-label={label} aria-invalid={!valid || undefined}
      onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); }} />
    {valid ? null : <span className="quantity-hint" role="alert">{rangeHint}</span>}
  </>;
}
