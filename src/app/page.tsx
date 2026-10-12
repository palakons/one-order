import { Suspense } from "react";
import { getBatches, getDeliveryLocations } from "@/lib/store";
import HomeClient from "./HomeClient";

async function HomeDataLoader() {
  try {
    const [batches, locations] = await Promise.all([
      getBatches(false),
      getDeliveryLocations(),
    ]);
    return <HomeClient initialBatches={batches} initialLocations={locations} />;
  } catch (err) {
    console.error("HomeDataLoader failed, loading fallback:", err);
    return <HomeClient initialBatches={[]} initialLocations={[]} />;
  }
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center space-y-3 font-sans">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wide text-neutral-300">
            VEATEC • กำลังโหลดไวท์บอร์ดรวมออเดอร์...
          </p>
        </div>
      }
    >
      <HomeDataLoader />
    </Suspense>
  );
}
