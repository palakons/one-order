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
  isActive?: boolean; // When false, leaders cannot create new boards for this drop-off point
}

export const CAMPUS_LOCATIONS: DeliveryLocation[] = [
  {
    id: "loc-m4",
    name: "M4 - IST (อาคารกลาง / ล็อบบี้)",
    nameEn: "M4 - IST (Central Lobby)",
    nameCn: "M4 - IST (中央大厅)",
    shortCode: "M4",
    description: "ล็อบบี้ ตึก M4 - IST (จุดรับอาหารกลาง)",
    descriptionEn: "Bldg M4 - IST Lobby (Main Food Drop-off)",
    descriptionCn: "M4 - IST 栋大厅 (主要取餐区)",
    deskDetail: "เคาน์เตอร์ชั้น 1 - โต๊ะวางอาหาร Delivery ตึก M4",
    deskDetailEn: "1st Floor Counter - Bldg M4 Delivery Table",
    deskDetailCn: "一楼前台 - M4 栋外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#432874]", // VISTEC IST Signature Purple
    mapUrl: "https://maps.google.com/?q=VISTEC+M4+Rayong",
    isActive: true, // Only M4 is enabled by default
  },
  {
    id: "loc-mse",
    name: "MSE (วัสดุศาสตร์)",
    nameEn: "MSE (Materials Science)",
    nameCn: "MSE (材料科学与工程)",
    shortCode: "MSE",
    description: "School of Materials Science & Engineering",
    descriptionEn: "Materials Science & Engineering",
    descriptionCn: "材料科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร MSE",
    deskDetailEn: "1st Floor Lobby - MSE Delivery Table",
    deskDetailCn: "一楼大厅 - MSE 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#F5A81C]", // VISTEC MSE Signature Yellow/Gold
    mapUrl: "https://maps.google.com/?q=VISTEC+MSE+Rayong",
    isActive: false, // Disabled
  },
  {
    id: "loc-ese",
    name: "ESE (พลังงานศาสตร์)",
    nameEn: "ESE (Energy Science)",
    nameCn: "ESE (能源科学与工程)",
    shortCode: "ESE",
    description: "School of Energy Science & Engineering",
    descriptionEn: "Energy Science & Engineering",
    descriptionCn: "能源科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร ESE",
    deskDetailEn: "1st Floor Lobby - ESE Delivery Table",
    deskDetailCn: "一楼大厅 - ESE 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#9B1238]", // VISTEC ESE Signature Maroon / Crimson Red
    mapUrl: "https://maps.google.com/?q=VISTEC+ESE+Rayong",
    isActive: false, // Disabled
  },
  {
    id: "loc-ist",
    name: "IST (สารสนเทศ & คอมพิวเตอร์)",
    nameEn: "IST (Information Science)",
    nameCn: "IST (信息科学与技术)",
    shortCode: "IST",
    description: "School of Information Science & Technology",
    descriptionEn: "Information Science & Technology",
    descriptionCn: "信息科学与技术学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร IST",
    deskDetailEn: "1st Floor Lobby - IST Delivery Table",
    deskDetailCn: "一楼大厅 - IST 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#432874]", // VISTEC IST Signature Purple
    mapUrl: "https://maps.google.com/?q=VISTEC+IST+Rayong",
    isActive: false, // Disabled
  },
  {
    id: "loc-bse",
    name: "BSE (ชีวโมเลกุล)",
    nameEn: "BSE (Biomolecular Science)",
    nameCn: "BSE (生物分子科学与工程)",
    shortCode: "BSE",
    description: "School of Biomolecular Science & Engineering",
    descriptionEn: "Biomolecular Science & Engineering",
    descriptionCn: "生物分子科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร BSE",
    deskDetailEn: "1st Floor Lobby - BSE Delivery Table",
    deskDetailCn: "一楼大厅 - BSE 外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#009245]", // VISTEC BSE Signature Emerald Green
    mapUrl: "https://maps.google.com/?q=VISTEC+BSE+Rayong",
    isActive: false, // Disabled
  },
  {
    id: "loc-dorm",
    name: "หอพักนักศึกษา (Student Dorm)",
    nameEn: "Student Dormitory",
    nameCn: "学生宿舍",
    shortCode: "Dorm",
    description: "VISTEC Student Dormitory",
    descriptionEn: "VISTEC Student Dormitory",
    descriptionCn: "VISTEC 学生宿舍区",
    deskDetail: "เคาน์เตอร์รับอาหารหน้าล็อบบี้หอพัก",
    deskDetailEn: "Front Counter - Dormitory Lobby Table",
    deskDetailCn: "宿舍大堂前台取餐桌",
    photoUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#2563eb]",
    mapUrl: "https://maps.google.com/?q=VISTEC+Student+Dormitory+Rayong",
    isActive: false, // Disabled
  },
  {
    id: "loc-hub",
    name: "Hub / สำนักอธิการฯ (Admin Hub)",
    nameEn: "Administration Hub",
    nameCn: "行政楼与学习中心",
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
    isActive: false, // Disabled
  },
];

let runtimeLocations: DeliveryLocation[] = [...CAMPUS_LOCATIONS];

export function setRuntimeLocations(locs: DeliveryLocation[]) {
  if (Array.isArray(locs) && locs.length > 0) {
    runtimeLocations = locs;
  }
}

export function getRuntimeLocations(): DeliveryLocation[] {
  return runtimeLocations;
}

export function getLocationById(id: string, customLocations?: DeliveryLocation[]): DeliveryLocation | undefined {
  const locList = customLocations && customLocations.length > 0 ? customLocations : runtimeLocations;
  return locList.find((loc) => loc.id === id) || locList[0];
}

export function getLocationForBatch(
  batch?: { buildingId?: string; buildingName?: string },
  customLocations?: DeliveryLocation[]
): DeliveryLocation {
  const locList = customLocations && customLocations.length > 0 ? customLocations : runtimeLocations;
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
