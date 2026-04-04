import { admin } from "@dollys-closet/core/lib/supabase/admin";
import { type CatalogApiProduct } from "@/types/product.types";
import ProductDetailsClient from "@/components/catalog/ProductDetailsClient";
import { type Metadata, type ResolvingMetadata } from "next";
import { resolveProductPlaceholder } from "@/lib/images/product-placeholder";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getProduct(id: string): Promise<CatalogApiProduct | null> {
  const { data, error } = await admin
    .from("products")
    .select("*, category:categories(name, parent:parent_id(name))")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // Manual join processing if needed, though usually Next.js handles this
  return data as CatalogApiProduct;
}

async function getCatalog(): Promise<CatalogApiProduct[]> {
  const { data, error } = await admin
    .from("products")
    .select("*, category:categories(name, parent:parent_id(name))")
    .limit(20);

  return (data as CatalogApiProduct[]) || [];
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = (await params).id;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const productImage = product.images[0] || resolveProductPlaceholder(product.categoryPath);

  return {
    title: `${product.name} | ${product.brand}`,
    description: product.description.replace(/<[^>]*>/g, "").slice(0, 160),
    openGraph: {
      title: `${product.name} | Dolly's Closet`,
      description: `Check out this ${product.name} from Dolly's Closet. Available for viewing in our boutique.`,
      images: [productImage, ...previousImages],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: `Special piece from Dolly's Closet: ${product.name}`,
      images: [productImage],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const id = (await params).id;
  
  // Prefetch data on server for instant load
  const [product, catalog] = await Promise.all([
    getProduct(id),
    getCatalog()
  ]);

  return (
    <ProductDetailsClient 
      productId={id} 
      initialProduct={product} 
      initialCatalog={catalog} 
    />
  );
}
