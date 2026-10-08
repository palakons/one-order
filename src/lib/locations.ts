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
    id: "loc-v",
    name: "ตึก V",
    shortCode: "V",
    description: "ทางเข้าหลัก ตึก V",
    deskDetail: "ชั้น 1 โถงกลาง - โต๊ะ One-Order ข้างป้อม รปภ.",
    photoUrl: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=600&q=80",
    color: "bg-blue-600",
  },
  {
    id: "loc-m1",
    name: "ตึก M1",
    shortCode: "M1",
    description: "ล็อบบี้ ตึก M1",
    deskDetail: "ชั้น G ทางเข้าหลัก - ชั้นวางของข้างลิฟต์ A",
    photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    color: "bg-emerald-600",
  },
  {
    id: "loc-m2",
    name: "ตึก M2",
    shortCode: "M2",
    description: "ล็อบบี้ ตึก M2",
    deskDetail: "ชั้น 1 โถงหน้า - โต๊ะยาวสีขาว ติดป้าย 'จุดรับข้าว One-Order'",
    photoUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
    color: "bg-amber-600",
  },
  {
    id: "loc-m3",
    name: "ตึก M3",
    shortCode: "M3",
    description: "ล็อบบี้ ตึก M3",
    deskDetail: "ชั้น G ประตูกระจก - โต๊ะข้างห้อง Student Lounge",
    photoUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
    color: "bg-purple-600",
  },
  {
    id: "loc-m4",
    name: "ตึก M4",
    shortCode: "M4",
    description: "ล็อบบี้ ตึก M4",
    deskDetail: "เคาน์เตอร์ชั้น 1 - ฝั่งซ้าย โต๊ะวางอาหาร Delivery",
    photoUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80",
    color: "bg-rose-600",
  },
  {
    id: "loc-canteen",
    name: "โรงอาหารกลาง",
    shortCode: "โรงอาหาร",
    description: "โรงอาหารกลาง มหาวิทยาลัย",
    deskDetail: "ทางเข้าทิศเหนือ - โต๊ะรับส่งอาหาร หน้าร้านค้าล็อค 1",
    photoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
    color: "bg-orange-600",
  },
  {
    id: "loc-k",
    name: "ตึก K",
    shortCode: "K",
    description: "ล็อบบี้หน้า ตึก K",
    deskDetail: "เคาน์เตอร์ทางเข้าด้านหน้า - จุดรับส่งอาหาร One-Order",
    photoUrl: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=600&q=80",
    color: "bg-indigo-600",
  },
];

export function getLocationById(id: string): DeliveryLocation | undefined {
  return CAMPUS_LOCATIONS.find((loc) => loc.id === id);
}
