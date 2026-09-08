import { HomeContent } from "./_components/home-content";
import { getProducts } from "./_lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();
  return <HomeContent products={products.items} />;
}
