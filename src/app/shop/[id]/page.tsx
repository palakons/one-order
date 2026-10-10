import { Suspense } from "react";
import { connection } from "next/server";
import { getBatchById } from "@/lib/store";
import ShopManifestClient from "./ShopManifestClient";

interface Props {
  params: Promise<{ id: string }>;
}

async function ShopManifestLoader({ params }: Props) {
  await connection();
  const { id } = await params;
  try {
    const initialBatch = await getBatchById(id);
    return <ShopManifestClient batchId={id} initialBatch={initialBatch || null} />;
  } catch (err) {
    console.error("ShopManifestLoader error:", err);
    return <ShopManifestClient batchId={id} initialBatch={null} />;
  }
}

export default function ShopManifestPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          Loading kitchen manifest...
        </div>
      }
    >
      <ShopManifestLoader params={params} />
    </Suspense>
  );
}
