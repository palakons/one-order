export interface DeliveryLocation {
  id: string;
  name: string;
  shortCode: string;
  description: string;
  deskDetail: string;
  photoUrl: string;
  color: string;
}

export const CAMPUS_LOCATIONS: DeliveryLocation[] = [
  {
    id: "loc-m4",
    name: "ตึก M4",
    shortCode: "M4",
    description: "ล็อบบี้ ตึก M4 (จุดรับอาหารกลาง)",
    deskDetail: "เคาน์เตอร์ชั้น 1 - ฝั่งซ้าย โต๊ะวางอาหาร Delivery",
    photoUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#B4213A]",
  },
];

export function getLocationById(id: string): DeliveryLocation | undefined {
  return CAMPUS_LOCATIONS.find((loc) => loc.id === id) || CAMPUS_LOCATIONS[0];
}
