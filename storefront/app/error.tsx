"use client";

export default function ErrorPage({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <div className="shell error-state"><h1>We couldn’t load the catalogue.</h1><p>Please try again in a moment.</p><button className="button button-primary" type="button" onClick={() => reset()}>Try again</button></div>;
}
