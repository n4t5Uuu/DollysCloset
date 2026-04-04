import type { Metadata } from "next";
import { ProductDetailsView } from "@dollys-closet/ui";

export const metadata: Metadata = {
  title: "Product Details | Dolly's Closet",
  description: "Explore curated product details from Dolly's Closet.",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ProductDetailsView productId={id} />;
}
