"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { Locale } from "../_lib/types";

const languages: ReadonlyArray<{ value: Locale; label: string; code: string }> = [
  { value: "en", label: "English", code: "EN" },
  { value: "ms", label: "Bahasa Melayu", code: "BM" },
];

export function LanguageMenu({ locale, label, onChange }: { locale: Locale; label: string; onChange: (locale: Locale) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = languages.findIndex((language) => language.value === locale);
  const selected = languages[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  function openAt(index: number) {
    setOpen(true);
    window.requestAnimationFrame(() => options.current[index]?.focus());
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowDown") next = (index + 1) % languages.length;
    else if (event.key === "ArrowUp") next = (index - 1 + languages.length) % languages.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = languages.length - 1;
    else return;
    event.preventDefault();
    options.current[next]?.focus();
  }

  function select(nextLocale: Locale) {
    onChange(nextLocale);
    setOpen(false);
    trigger.current?.focus();
  }

  return <div className="language-menu" data-open={open} ref={root}>
    <button
      ref={trigger}
      type="button"
      className="language-menu-trigger"
      aria-label={`${label}: ${selected.label}`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls="language-menu-options"
      onClick={() => open ? setOpen(false) : openAt(selectedIndex)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          openAt(event.key === "ArrowDown" ? selectedIndex : languages.length - 1);
        }
      }}
    >
      <svg className="language-menu-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21M12 3c-2.5 2.5-3.8 5.5-3.8 9s1.3 6.5 3.8 9" /></svg>
      <span className="language-menu-label">{selected.label}</span>
      <span className="language-menu-code">{selected.code}</span>
      <svg className="language-menu-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    <div id="language-menu-options" className="language-menu-popover" role="menu" aria-label={label} aria-hidden={!open}>
      {languages.map((language, index) => <button
        key={language.value}
        ref={(node) => { options.current[index] = node; }}
        type="button"
        role="menuitemradio"
        aria-checked={locale === language.value}
        tabIndex={open ? 0 : -1}
        className="language-menu-option"
        onClick={() => select(language.value)}
        onKeyDown={(event) => moveFocus(event, index)}
      >
        <span className="language-option-code" aria-hidden="true">{language.code}</span>
        <span>{language.label}</span>
        <svg className="language-option-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>
      </button>)}
    </div>
  </div>;
}
