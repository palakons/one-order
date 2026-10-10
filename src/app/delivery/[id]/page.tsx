import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getBatchById } from "@/lib/store";
import DeliveryClient from "./DeliveryClient";

interface Props {
  params: Promise<{ id: string }>;
}

async function DeliveryDataLoader({ params }: Props) {
  await connection();
  const { id } = await params;
  try {
    // Fetch sanitized batch details (masks phone numbers, strips private slips)
    const batch = await getBatchById(id, true);
    if (!batch) {
      notFound();
    }
    return <DeliveryClient initialBatch={batch} batchId={id} />;
  } catch (err) {
    console.error("DeliveryDataLoader error:", err);
    notFound();
  }
}

export default function DeliveryPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          กำลังโหลดรูปถ่ายและรายการกล่องอาหาร...
        </div>
      }
    >
      <DeliveryDataLoader params={params} />
    </Suspense>
  );
}
