import type { Metadata } from "next";
import MyOrdersClient from "./MyOrdersClient";

export const metadata: Metadata = {
  title: "ออเดอร์ของฉัน | VEATEC @ VISTEC",
  description: "ติดตามสถานะออเดอร์อาหาร จุดรับของ และรูปถ่ายหลักฐานการจัดส่ง",
};

export default function OrdersPage() {
  return <MyOrdersClient />;
}
