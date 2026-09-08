import Link from "next/link";

export default function NotFound() { return <div className="shell error-state"><h1>This product is not currently available.</h1><Link href="/products" className="button button-primary">Browse products</Link></div>; }
