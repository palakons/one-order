import { Suspense } from "react";
import { connection } from "next/server";
import { getBatches, getShops, getDeliveryLocations, getSystemStatus } from "@/lib/store";
import AdminClient from "./AdminClient";

async function AdminDataLoader() {
  await connection();
  try {
    const [batches, shops, locations, systemStatus] = await Promise.all([
      getBatches(),
      getShops(),
      getDeliveryLocations(),
      getSystemStatus(),
    ]);
    return (
      <AdminClient
        initialBatches={batches}
        initialShops={shops}
        initialLocations={locations}
        initialSystemStatus={systemStatus}
      />
    );
  } catch (err) {
    console.error("AdminDataLoader error:", err);
    return <AdminClient initialBatches={[]} initialShops={[]} initialLocations={[]} />;
  }
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
