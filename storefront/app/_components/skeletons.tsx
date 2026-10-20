"use client";

import { productCopy } from "../_lib/product-view";
import { useLocale } from "./locale-provider";

function Bar({ width, height, className = "" }: { width: string; height?: number; className?: string }) {
  return <span className={`skeleton ${className}`.trim()} style={{ width, height }} aria-hidden="true" />;
}

function Busy({ children, className }: { children: React.ReactNode; className?: string }) {
  const { locale } = useLocale();
  return <div className={className} role="status" aria-busy="true"><span className="sr-only">{productCopy[locale].loading}</span>{children}</div>;
}

export function CardSkeletons({ count = 6, home = false }: { count?: number; home?: boolean }) {
  const card = home ? "home-product-card" : "catalogue-card";
  return <div className={home ? "home-product-grid" : "catalogue-grid"} aria-hidden="true">
    {Array.from({ length: count }, (_, i) => <div key={i} className={`${card} skeleton-card`}>
      <span className={home ? "home-product-photo" : "catalogue-card-image"} />
      {home ? <Bar width="34%" height={22} className="skeleton-chip" /> : <span className="skeleton-row skeleton-meta"><Bar width="22%" height={18} /><Bar width="30%" height={24} className="skeleton-round" /></span>}
      <Bar width="72%" height={26} />
      {home ? null : <><Bar width="100%" height={14} /><Bar width="80%" height={14} className="skeleton-tight" /></>}
      <span className="skeleton-row"><Bar width="28%" height={24} /><Bar width="44px" height={44} className="skeleton-round" /></span>
    </div>)}
  </div>;
}

export function HomeProductsSkeleton() {
  return <Busy><CardSkeletons home /></Busy>;
}

export function CatalogueSkeleton() {
  return <Busy className="product-concept">
    <section className="catalogue-hero"><div className="shell">
      <div className="skeleton-crumbs"><Bar width="160px" height={18} /></div>
      <div className="catalogue-hero-copy"><Bar width="min(460px, 80%)" height={84} /><Bar width="min(260px, 60%)" height={20} className="skeleton-gap" /></div>
    </div></section>
    <div className="shell catalogue-content"><CardSkeletons /></div>
  </Busy>;
}

export function ProductSkeleton() {
  return <Busy className="product-concept">
    <div className="detail-topbar"><div className="shell skeleton-crumbs"><Bar width="220px" height={18} /></div></div>
    <section className="shell shop-detail">
      <div className="shop-detail-image" aria-hidden="true" />
      <div className="shop-detail-copy">
        <Bar width="80%" height={56} />
        <Bar width="40%" height={36} className="skeleton-gap" />
        <span className="skeleton-row skeleton-gap"><Bar width="140px" height={52} className="skeleton-round" /><Bar width="100%" height={52} className="skeleton-round" /></span>
        <Bar width="100%" height={52} className="skeleton-round skeleton-line" />
      </div>
    </section>
  </Busy>;
}

export function PageSkeleton() {
  return <Busy className="shell skeleton-page">
    <Bar width="min(480px, 75%)" height={52} />
    <Bar width="100%" height={16} className="skeleton-gap" />
    <Bar width="94%" height={16} className="skeleton-line" />
    <Bar width="70%" height={16} className="skeleton-line" />
  </Busy>;
}
