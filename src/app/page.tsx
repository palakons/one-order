import { Suspense } from "react";
import { connection } from "next/server";
import { getBatches } from "@/lib/store";
import HomeClient from "./HomeClient";

async function HomeDataLoader() {
  await connection();
  const batches = await getBatches(false);
  return <HomeClient initialBatches={batches} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          กำลังโหลดข้อมูล VEATEC (VISTEC Eats)...
        </div>
      }
    >
      <HomeDataLoader />
    </Suspense>
  );
}
