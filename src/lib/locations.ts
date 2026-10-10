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
    deskDetail: "เคาน์เตอร์ชั้น 1 - โต๊ะวางอาหาร Delivery ตึก M4",
    photoUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#B4213A]",
  },
  {
    id: "loc-mse",
    name: "ตึก MSE",
    shortCode: "MSE",
    description: "Materials Science & Engineering",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร MSE",
    photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#0284c7]",
  },
  {
    id: "loc-ese",
    name: "ตึก ESE",
    shortCode: "ESE",
    description: "Energy Science & Engineering",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร ESE",
    photoUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#059669]",
  },
  {
    id: "loc-ist",
    name: "ตึก IST",
    shortCode: "IST",
    description: "Information Science & Technology",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร IST",
    photoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#7c3aed]",
  },
  {
    id: "loc-bse",
    name: "ตึก BSE",
    shortCode: "BSE",
    description: "Biomolecular Science & Engineering",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร BSE",
    photoUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#ea580c]",
  },
  {
    id: "loc-dorm",
    name: "หอพักนักศึกษา",
    shortCode: "Dorm",
    description: "VISTEC Student Dormitory",
    deskDetail: "เคาน์เตอร์รับอาหารหน้าล็อบบี้หอพัก",
    photoUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#4f46e5]",
  },
  {
    id: "loc-hub",
    name: "ตึก Hub / สำนักอธิการฯ",
    shortCode: "Hub",
    description: "Administration Hub & Learning Center",
    deskDetail: "โต๊ะรับ Delivery ด้านหน้าตึก Hub",
    photoUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#0d9488]",
  },
];

export function getLocationById(id: string): DeliveryLocation | undefined {
  return CAMPUS_LOCATIONS.find((loc) => loc.id === id) || CAMPUS_LOCATIONS[0];
}
