"use client";

import Image from "next/image";
import { useState } from "react";
import { productCopy } from "../_lib/product-view";
import { useLocale } from "./locale-provider";

import { productMediaUrl } from "../_lib/product-media";

export function ProductArtwork({ imagePath, name, detail = false }: { imagePath: string | null; name: string; detail?: boolean }) {
  const { locale } = useLocale();
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const src = productMediaUrl(imagePath);
  if (!src || imagePath === failedPath) return <div className="catalogue-photo-placeholder"><span aria-hidden="true">✳</span><p>{productCopy[locale].photo}</p></div>;
  return <Image src={src} alt={name} fill unoptimized sizes={detail ? "(max-width: 760px) 92vw, 50vw" : "(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 30vw"} loading={detail ? "eager" : "lazy"} onError={() => setFailedPath(imagePath)} />;
}
