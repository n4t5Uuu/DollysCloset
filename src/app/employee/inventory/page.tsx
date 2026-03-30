import InventoryManagement from "@/components/inventory/InventoryManagement";

export default async function EmployeeInventoryPage({ searchParams }: { searchParams: Promise<{ availability?: string }> }) {
  const params = await searchParams;
  return <InventoryManagement initialAvailabilityFilter={params.availability} />;
}
