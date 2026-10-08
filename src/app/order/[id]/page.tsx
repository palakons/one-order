import { Suspense } from "react";
import { getBatchById } from "@/lib/store";
import OrderPageClient from "./OrderPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

async function OrderPageLoader({ params }: Props) {
  const { id } = await params;
  const initialBatch = await getBatchById(id);
  return <OrderPageClient batchId={id} initialBatch={initialBatch || null} />;
}

export default function OrderPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          Loading order...
        </div>
      }
    >
      <OrderPageLoader params={params} />
    </Suspense>
  );
}
