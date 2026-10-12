import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

async function OrderRedirect({ params }: Props): Promise<null> {
  await connection();
  const { id } = await params;
  redirect(`/?batch=${id}`);
  return null;
}

export default function OrderPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          กำลังเปิดกระดานออเดอร์...
        </div>
      }
    >
      <OrderRedirect params={params} />
    </Suspense>
  );
}
