export interface DeliveryLocation {
  id: string;
  name: string;
  nameEn?: string;
  nameCn?: string;
  shortCode: string;
  description: string;
  descriptionEn?: string;
  descriptionCn?: string;
  deskDetail: string;
  deskDetailEn?: string;
  deskDetailCn?: string;
  photoUrl: string;
  color: string;
  mapUrl?: string; // Google Maps link for the drop-off location
}

export const CAMPUS_LOCATIONS: DeliveryLocation[] = [
  {
    id: "loc-m4",
    name: "ตึก M4",
    nameEn: "Bldg M4",
    nameCn: "M4 栋",
    shortCode: "M4",
    description: "ล็อบบี้ ตึก M4 (จุดรับอาหารกลาง)",
    descriptionEn: "Bldg M4 Lobby (Main Food Drop-off)",
    descriptionCn: "M4 栋大厅 (主要取餐区)",
    deskDetail: "เคาน์เตอร์ชั้น 1 - โต๊ะวางอาหาร Delivery ตึก M4",
    deskDetailEn: "1st Floor Counter - Bldg M4 Delivery Table",
    deskDetailCn: "一楼前台 - M4 栋外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#B4213A]",
    mapUrl: "https://maps.google.com/?q=VISTEC+M4+Rayong",
  },
  {
    id: "loc-mse",
    name: "ตึก MSE",
    nameEn: "Bldg MSE",
    nameCn: "MSE 栋",
    shortCode: "MSE",
    description: "Materials Science & Engineering",
    descriptionEn: "Materials Science & Engineering",
    descriptionCn: "材料科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร MSE",
    deskDetailEn: "1st Floor Lobby - MSE Delivery Table",
    deskDetailCn: "一楼大厅 - MSE 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#0284c7]",
    mapUrl: "https://maps.google.com/?q=VISTEC+MSE+Rayong",
  },
  {
    id: "loc-ese",
    name: "ตึก ESE",
    nameEn: "Bldg ESE",
    nameCn: "ESE 栋",
    shortCode: "ESE",
    description: "Energy Science & Engineering",
    descriptionEn: "Energy Science & Engineering",
    descriptionCn: "能源科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร ESE",
    deskDetailEn: "1st Floor Lobby - ESE Delivery Table",
    deskDetailCn: "一楼大厅 - ESE 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#059669]",
    mapUrl: "https://maps.google.com/?q=VISTEC+ESE+Rayong",
  },
  {
    id: "loc-ist",
    name: "ตึก IST",
    nameEn: "Bldg IST",
    nameCn: "IST 栋",
    shortCode: "IST",
    description: "Information Science & Technology",
    descriptionEn: "Information Science & Technology",
    descriptionCn: "信息科学与技术学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร IST",
    deskDetailEn: "1st Floor Lobby - IST Delivery Table",
    deskDetailCn: "一楼大厅 - IST 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#7c3aed]",
    mapUrl: "https://maps.google.com/?q=VISTEC+IST+Rayong",
  },
  {
    id: "loc-bse",
    name: "ตึก BSE",
    nameEn: "Bldg BSE",
    nameCn: "BSE 栋",
    shortCode: "BSE",
    description: "Biomolecular Science & Engineering",
    descriptionEn: "Biomolecular Science & Engineering",
    descriptionCn: "生物分子科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร BSE",
    deskDetailEn: "1st Floor Lobby - BSE Delivery Table",
    deskDetailCn: "一楼大厅 - BSE 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#ea580c]",
    mapUrl: "https://maps.google.com/?q=VISTEC+BSE+Rayong",
  },
  {
    id: "loc-dorm",
    name: "หอพักนักศึกษา",
    nameEn: "Student Dorm",
    nameCn: "学生宿舍",
    shortCode: "Dorm",
    description: "VISTEC Student Dormitory",
    descriptionEn: "VISTEC Student Dormitory",
    descriptionCn: "VISTEC 学生宿舍区",
    deskDetail: "เคาน์เตอร์รับอาหารหน้าล็อบบี้หอพัก",
    deskDetailEn: "Front Counter - Dormitory Lobby Table",
    deskDetailCn: "宿舍大堂前台取餐桌",
    photoUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#4f46e5]",
    mapUrl: "https://maps.google.com/?q=VISTEC+Student+Dormitory+Rayong",
  },
  {
    id: "loc-hub",
    name: "ตึก Hub / สำนักอธิการฯ",
    nameEn: "Hub Building",
    nameCn: "Hub 行政楼",
    shortCode: "Hub",
    description: "Administration Hub & Learning Center",
    descriptionEn: "Administration Hub & Learning Center",
    descriptionCn: "行政楼与学习中心",
    deskDetail: "โต๊ะรับ Delivery ด้านหน้าตึก Hub",
    deskDetailEn: "Front Entrance - Hub Delivery Table",
    deskDetailCn: "Hub 楼正门外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#0d9488]",
    mapUrl: "https://maps.google.com/?q=VISTEC+Administration+Hub+Rayong",
  },
];

export function getLocationById(id: string): DeliveryLocation | undefined {
  return CAMPUS_LOCATIONS.find((loc) => loc.id === id) || CAMPUS_LOCATIONS[0];
}

export function getLocationForBatch(
  batch?: { buildingId?: string; buildingName?: string },
  customLocations?: DeliveryLocation[]
): DeliveryLocation {
  const locList = customLocations && customLocations.length > 0 ? customLocations : CAMPUS_LOCATIONS;
  if (!batch) return locList[0] || CAMPUS_LOCATIONS[0];

  if (batch.buildingId) {
    const byId = locList.find((l) => l.id === batch.buildingId);
    if (byId) return byId;
  }

  if (batch.buildingName) {
    const raw = batch.buildingName.trim().toLowerCase();
    const clean = raw.replace("ตึก", "").replace("อาคาร", "").replace("bldg", "").trim();
    const byName = locList.find((l) => {
      const lName = l.name.toLowerCase();
      const lCode = l.shortCode.toLowerCase();
      return (
        lName === raw ||
        lCode === raw ||
        lCode === clean ||
        lName.includes(clean) ||
        raw.includes(lCode)
      );
    });
    if (byName) return byName;
  }

  return locList[0] || CAMPUS_LOCATIONS[0];
}

export function getDropOffMapUrl(
  batch?: { buildingId?: string; buildingName?: string },
  customLocations?: DeliveryLocation[]
): string {
  const loc = getLocationForBatch(batch, customLocations);
  if (loc.mapUrl && loc.mapUrl.trim()) {
    return loc.mapUrl.trim();
  }
  return `https://maps.google.com/?q=${encodeURIComponent(loc.name + " VISTEC Rayong")}`;
}

export function getLocalizedLocation(loc: DeliveryLocation, lang: "th" | "en" | "cn" = "th") {
  if (lang === "en") {
    return {
      name: loc.nameEn || loc.name,
      description: loc.descriptionEn || loc.description,
      deskDetail: loc.deskDetailEn || loc.deskDetail,
    };
  }
  if (lang === "cn") {
    return {
      name: loc.nameCn || loc.name,
      description: loc.descriptionCn || loc.description,
      deskDetail: loc.deskDetailCn || loc.deskDetail,
    };
  }
  return {
    name: loc.name,
    description: loc.description,
    deskDetail: loc.deskDetail,
  };
}
