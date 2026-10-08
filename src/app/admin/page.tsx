import { Suspense } from "react";
import { getBatches, getShops } from "@/lib/store";
import AdminClient from "./AdminClient";

async function AdminDataLoader() {
  const [batches, shops] = await Promise.all([
    getBatches(),
    getShops(),
  ]);
  return <AdminClient initialBatches={batches} initialShops={shops} />;
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          กำลังโหลดข้อมูล VEATEC Hub...
        </div>
      }
    >
      <AdminDataLoader />
    </Suspense>
  );
}
