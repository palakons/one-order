import { Suspense } from "react";
import { getBatches } from "@/lib/store";
import HomeClient from "./HomeClient";

async function HomeDataLoader() {
  const batches = await getBatches();
  return <HomeClient initialBatches={batches} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          Loading One-Order campus pools...
        </div>
      }
    >
      <HomeDataLoader />
    </Suspense>
  );
}
