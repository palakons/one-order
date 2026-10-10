import { Suspense } from "react";
import { connection } from "next/server";
import { getBatches } from "@/lib/store";
import HomeClient from "./HomeClient";

async function HomeDataLoader() {
  await connection();
  try {
    const batches = await getBatches(false);
    return <HomeClient initialBatches={batches} />;
  } catch (err) {
    console.error("HomeDataLoader failed, loading fallback:", err);
    return <HomeClient initialBatches={[]} />;
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
