import InventoryManagement from "@/components/inventory/InventoryManagement";

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ availability?: string }> }) {
  const params = await searchParams;
  return <InventoryManagement initialAvailabilityFilter={params.availability} />;
}
