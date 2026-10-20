"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { accountCopy, type AccountCopy } from "../_lib/account-copy";
import type { CustomerAccount } from "../_lib/accounts";
import { returnPathAfterSignIn } from "../_lib/checkout";
import { money } from "../_lib/content";
import { trackingDate, trackingStage, type TrackedOrder } from "../_lib/order-tracking";
import { trackingCopy } from "../_lib/tracking-copy";
import { useLocale } from "./locale-provider";
import { TrackedOrderView } from "./order-tracking";

type Result<T> = { status: number; data: T | null };

async function call<T>(method: string, path: string, body?: unknown): Promise<Result<T>> {
  try {
    const response = await fetch(`/storefront-data/account/${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null) as T | null;
    return { status: response.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function failure(text: AccountCopy, status: number, badRequest: string): string {
  if (status === 400) return badRequest;
  if (status === 429) return text.busy;
  return text.failed;
}

export function AccountPage() {
  const { locale } = useLocale();
  const text = accountCopy[locale];
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [state, setState] = useState<"loading" | "signedOut" | "signedIn" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const result = await call<CustomerAccount>("GET", "me");
    if (result.status === 200 && result.data) {
      setAccount(result.data);
      setState("signedIn");
    } else if (result.status === 200 || result.status === 401) {
      setState("signedOut");
    } else {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Reading the session is an external sync, so state is set from its result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const signedOut = (message: string | null) => {
    setAccount(null);
    setNotice(message);
    setState("signedOut");
  };

  return <div className="checkout-concept account-concept">
    <section className="cart-hero"><div className="shell"><h1>{text.title}</h1>{account ? <p>{text.signedInAs} <strong>{account.email}</strong></p> : null}</div></section>
    <section className="shell checkout-content account-content" aria-live="polite">
      {state === "loading" ? <p className="account-loading">{text.loading}</p> : null}
      {state === "error" ? <div className="cart-error" role="alert"><p>{text.failed}</p><button type="button" className="home-text-link" onClick={() => { setState("loading"); void load(); }}>{trackingCopy[locale].tryAgain}</button></div> : null}
      {state === "signedOut" ? <SignIn text={text} notice={notice} onSignedIn={(next) => { const back = returnPathAfterSignIn(window.location.search); if (back) { router.push(back); return; } setNotice(null); setAccount(next); setState("signedIn"); }} /> : null}
      {state === "signedIn" && account ? <Dashboard text={text} account={account} onChange={setAccount} onSignedOut={signedOut} /> : null}
    </section>
  </div>;
}

function Panel({ title, intro, children, tone }: { title: string; intro?: string; children: ReactNode; tone?: "danger" }) {
  const id = useId();
  return <section className="checkout-panel account-panel" data-tone={tone} aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    {intro ? <p className="checkout-hint">{intro}</p> : null}
    {children}
  </section>;
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return <div className="checkout-field" data-invalid={error ? "" : undefined}>
    <label htmlFor={id}>{label}</label>
    {hint ? <p id={`${id}-hint`} className="checkout-hint">{hint}</p> : null}
    {children}
    {error ? <p id={`${id}-error`} className="checkout-error">{error}</p> : null}
  </div>;
}

function describedBy(id: string, hint: boolean, error: unknown) {
  return [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

function SignIn({ text, notice, onSignedIn }: { text: AccountCopy; notice: string | null; onSignedIn: (account: CustomerAccount) => void }) {
  const { locale } = useLocale();
  const formId = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"code" | "password">("code");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; code?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setError(null);
    if (!EMAIL_PATTERN.test(email.trim())) return setFieldError({ email: text.emailInvalid });
    setFieldError({});
    setBusy(true);
    const result = await call<{ demo_code: string | null }>("POST", "code", { email: email.trim(), locale });
    setBusy(false);
    if (result.status !== 200) return setError(failure(text, result.status, text.emailInvalid));
    setDemoCode(result.data?.demo_code ?? null);
    setCode("");
    setStep("code");
    requestAnimationFrame(() => codeRef.current?.focus());
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) return setFieldError({ code: text.codeFormat });
    setFieldError({});
    setBusy(true);
    const result = await call<CustomerAccount>("POST", "code/verify", { email: email.trim(), code: code.trim(), locale });
    setBusy(false);
    if (result.status === 200 && result.data) return onSignedIn(result.data);
    setError(failure(text, result.status, text.codeInvalid));
  }

  async function passwordSignIn(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const errors = { email: EMAIL_PATTERN.test(email.trim()) ? undefined : text.emailInvalid, password: password ? undefined : text.passwordShort };
    setFieldError(errors);
    if (errors.email || errors.password) return;
    setBusy(true);
    const result = await call<CustomerAccount>("POST", "password/sign-in", { email: email.trim(), password });
    setBusy(false);
    if (result.status === 200 && result.data) return onSignedIn(result.data);
    setError(failure(text, result.status, text.passwordInvalid));
  }

  const emailField = <Field id={`${formId}-email`} label={text.email} hint={text.emailHint} error={fieldError.email}>
    <input id={`${formId}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldError.email) || undefined} aria-describedby={describedBy(`${formId}-email`, true, fieldError.email)} />
  </Field>;

  return <div className="account-sign-in">
    {notice ? <p className="account-notice" role="status">{notice}</p> : null}
    <Panel title={text.signInTitle} intro={text.signInIntro}>
      {error ? <div className="cart-error" role="alert"><p>{error}</p></div> : null}
      {mode === "password" ? <form className="checkout-form" onSubmit={passwordSignIn} noValidate aria-busy={busy}>
        {emailField}
        <Field id={`${formId}-password`} label={text.password} error={fieldError.password}>
          <input id={`${formId}-password`} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(fieldError.password) || undefined} aria-describedby={describedBy(`${formId}-password`, false, fieldError.password)} />
        </Field>
        <button type="submit" className="home-button" disabled={busy}>{busy ? text.verifying : text.signInWithPassword}</button>
        <button type="button" className="home-text-link" onClick={() => { setMode("code"); setError(null); setFieldError({}); }}>{text.useCode}</button>
      </form> : step === "email" ? <form className="checkout-form" onSubmit={sendCode} noValidate aria-busy={busy}>
        {emailField}
        <button type="submit" className="home-button" disabled={busy}>{busy ? text.sendingCode : text.sendCode}</button>
        <button type="button" className="home-text-link" onClick={() => { setMode("password"); setError(null); setFieldError({}); }}>{text.usePassword}</button>
      </form> : <form className="checkout-form" onSubmit={verify} noValidate aria-busy={busy}>
        <p className="account-notice" role="status">{text.codeSent}{demoCode ? <><br /><span className="account-demo">{text.demoCode} <strong>{demoCode}</strong></span></> : null}</p>
        <Field id={`${formId}-code`} label={text.code} error={fieldError.code}>
          <input ref={codeRef} id={`${formId}-code`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(fieldError.code) || undefined} aria-describedby={describedBy(`${formId}-code`, false, fieldError.code)} />
        </Field>
        <button type="submit" className="home-button" disabled={busy}>{busy ? text.verifying : text.verify}</button>
        <div className="account-links">
          <button type="button" className="home-text-link" onClick={() => void sendCode()} disabled={busy}>{text.resend}</button>
          <button type="button" className="home-text-link" onClick={() => { setStep("email"); setError(null); setDemoCode(null); }}>{text.useDifferentEmail}</button>
        </div>
      </form>}
    </Panel>
  </div>;
}

function Dashboard({ text, account, onChange, onSignedOut }: { text: AccountCopy; account: CustomerAccount; onChange: (account: CustomerAccount) => void; onSignedOut: (message: string | null) => void }) {
  const expired = () => onSignedOut(text.sessionEnded);
  return <div className="account-dashboard">
    <Orders text={text} onExpired={expired} />
    <div className="account-side">
      <Details text={text} account={account} onChange={onChange} onExpired={expired} />
      <PasswordPanel text={text} account={account} onChange={onChange} onExpired={expired} />
      <DataPanel text={text} account={account} onSignedOut={onSignedOut} onExpired={expired} />
    </div>
  </div>;
}

function Orders({ text, onExpired }: { text: AccountCopy; onExpired: () => void }) {
  const { locale } = useLocale();
  const tracking = trackingCopy[locale];
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const result = await call<{ orders: TrackedOrder[] }>("GET", "orders");
    if (result.status === 401) return onExpired();
    if (result.status === 200 && result.data) setOrders(result.data.orders);
    else setFailed(true);
  }, [onExpired]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return <Panel title={text.ordersTitle} intro={text.ordersHint}>
    {failed ? <div className="cart-error" role="alert"><p>{text.failed}</p><button type="button" className="home-text-link" onClick={() => void load()}>{tracking.tryAgain}</button></div>
      : orders === null ? <p className="account-loading">{text.loading}</p>
      : orders.length === 0 ? <div className="account-empty"><p>{text.ordersEmpty}</p><Link href="/products" className="home-button">{text.shop}</Link></div>
      : <ul className="account-orders">{orders.map((order) => <li key={order.order_number}>
        <details>
          <summary>
            <span className="account-order-number">{text.order} #{order.order_number}</span>
            <span className="account-order-date">{trackingDate(order.created_at, locale)}</span>
            <span className="account-order-status">{tracking.stage[trackingStage(order)]}</span>
            <strong className="account-order-total">{money(order.total_amount)}</strong>
            <span className="account-order-toggle">{text.viewDetails}</span>
          </summary>
          <TrackedOrderView order={order} />
        </details>
      </li>)}</ul>}
  </Panel>;
}

function Details({ text, account, onChange, onExpired }: { text: AccountCopy; account: CustomerAccount; onChange: (account: CustomerAccount) => void; onExpired: () => void }) {
  const formId = useId();
  const [name, setName] = useState(account.full_name ?? "");
  const [phone, setPhone] = useState(account.phone_number ?? "");
  const [language, setLanguage] = useState(account.locale);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setStatus(null);
    setPhoneError(null);
    setBusy(true);
    const result = await call<CustomerAccount>("PATCH", "me", { full_name: name, phone_number: phone, locale: language });
    setBusy(false);
    if (result.status === 401) return onExpired();
    if (result.status === 200 && result.data) {
      onChange(result.data);
      setPhone(result.data.phone_number ?? "");
      return setStatus({ tone: "ok", message: text.saved });
    }
    if (result.status === 422) return setPhoneError(text.phoneInvalid);
    setStatus({ tone: "error", message: failure(text, result.status, text.failed) });
  }

  return <Panel title={text.detailsTitle}>
    <form className="checkout-form" onSubmit={save} noValidate aria-busy={busy}>
      <Field id={`${formId}-name`} label={text.fullName}>
        <input id={`${formId}-name`} autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field id={`${formId}-phone`} label={text.phone} hint={text.phoneHint} error={phoneError}>
        <input id={`${formId}-phone`} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(phoneError) || undefined} aria-describedby={describedBy(`${formId}-phone`, true, phoneError)} />
      </Field>
      <Field id={`${formId}-language`} label={text.language}>
        <select id={`${formId}-language`} value={language} onChange={(event) => setLanguage(event.target.value === "ms" ? "ms" : "en")}>
          <option value="en">English</option>
          <option value="ms">Bahasa Melayu</option>
        </select>
      </Field>
      {status ? <p className={status.tone === "ok" ? "account-notice" : "checkout-error"} role="status">{status.message}</p> : null}
      <button type="submit" className="home-button" disabled={busy}>{busy ? text.saving : text.save}</button>
    </form>
  </Panel>;
}

function PasswordPanel({ text, account, onChange, onExpired }: { text: AccountCopy; account: CustomerAccount; onChange: (account: CustomerAccount) => void; onExpired: () => void }) {
  const formId = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setSaved(false);
    if (next.length < 8) return setError(text.passwordShort);
    setError(null);
    setBusy(true);
    const result = await call<CustomerAccount>("POST", "password", { new_password: next, current_password: current || null });
    setBusy(false);
    if (result.status === 401) return onExpired();
    if (result.status === 200 && result.data) {
      onChange(result.data);
      setCurrent("");
      setNext("");
      return setSaved(true);
    }
    setError(failure(text, result.status, text.currentWrong));
  }

  return <Panel title={text.passwordTitle} intro={account.has_password ? text.passwordChangeIntro : text.passwordIntro}>
    <form className="checkout-form" onSubmit={save} noValidate aria-busy={busy}>
      {account.has_password ? <Field id={`${formId}-current`} label={text.currentPassword} hint={text.currentPasswordHint}>
        <input id={`${formId}-current`} type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} aria-describedby={`${formId}-current-hint`} />
      </Field> : null}
      <Field id={`${formId}-new`} label={text.newPassword} hint={text.newPasswordHint} error={error}>
        <input id={`${formId}-new`} type="password" autoComplete="new-password" maxLength={128} value={next} onChange={(event) => setNext(event.target.value)} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy(`${formId}-new`, true, error)} />
      </Field>
      {saved ? <p className="account-notice" role="status">{text.passwordSaved}</p> : null}
      <button type="submit" className="home-button" disabled={busy}>{busy ? text.saving : account.has_password ? text.changePassword : text.setPassword}</button>
    </form>
  </Panel>;
}

function DataPanel({ text, account, onSignedOut, onExpired }: { text: AccountCopy; account: CustomerAccount; onSignedOut: (message: string | null) => void; onExpired: () => void }) {
  const formId = useId();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (confirmEmail.trim().toLowerCase() !== account.email) return setError(text.deleteMismatch);
    setError(null);
    setBusy(true);
    const result = await call<null>("POST", "delete", { confirm_email: confirmEmail.trim() });
    setBusy(false);
    if (result.status === 401) return onExpired();
    if (result.status === 204) return onSignedOut(text.deleted);
    setError(failure(text, result.status, text.deleteMismatch));
  }

  async function signOut() {
    setBusy(true);
    const result = await call<null>("POST", "sign-out");
    setBusy(false);
    if (result.status === 204 || result.status === 401) onSignedOut(null);
    else setError(text.failed);
  }

  return <>
    <Panel title={text.privacyTitle} intro={text.privacyIntro}>
      <a className="home-text-link" href="/storefront-data/account/export" download>{text.download}</a>
      <div className="account-sign-out">
        <button type="button" className="home-button home-button-secondary" onClick={() => void signOut()} disabled={busy}>{text.signOut}</button>
        <p className="checkout-hint">{text.signOutHint}</p>
      </div>
    </Panel>
    <Panel title={text.deleteTitle} intro={text.deleteIntro} tone="danger">
      <form className="checkout-form" onSubmit={remove} noValidate aria-busy={busy}>
        <Field id={`${formId}-confirm`} label={text.deleteConfirm} error={error}>
          <input id={`${formId}-confirm`} type="email" autoComplete="off" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy(`${formId}-confirm`, false, error)} />
        </Field>
        <button type="submit" className="home-button account-danger" disabled={busy}>{busy ? text.deleting : text.deleteButton}</button>
      </form>
    </Panel>
  </>;
}
