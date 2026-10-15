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
    id: "loc-m1",
    name: "M1 - ESE (พลังงานศาสตร์)",
    nameEn: "M1 - ESE (Energy Science)",
    nameCn: "M1 - ESE (能源科学与工程)",
    shortCode: "M1",
    description: "School of Energy Science & Engineering (อาคาร M1)",
    descriptionEn: "Bldg M1 - School of Energy Science & Engineering",
    descriptionCn: "M1 栋 - 能源科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร M1 (ESE)",
    deskDetailEn: "1st Floor Lobby - Bldg M1 Delivery Table",
    deskDetailCn: "一楼大厅 - M1 栋外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#9B1238]", // VISTEC ESE Crimson Red / Maroon
    mapUrl: "https://maps.google.com/?q=VISTEC+M1+ESE+Rayong",
    isActive: false, // Disabled by default
  },
  {
    id: "loc-m2",
    name: "M2 - MSE (วัสดุศาสตร์)",
    nameEn: "M2 - MSE (Materials Science)",
    nameCn: "M2 - MSE (材料科学与工程)",
    shortCode: "M2",
    description: "School of Materials Science & Engineering (อาคาร M2)",
    descriptionEn: "Bldg M2 - School of Materials Science & Engineering",
    descriptionCn: "M2 栋 - 材料科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร M2 (MSE)",
    deskDetailEn: "1st Floor Lobby - Bldg M2 Delivery Table",
    deskDetailCn: "一楼大厅 - M2 栋外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#F5A81C]", // VISTEC MSE Gold / Yellow
    mapUrl: "https://maps.google.com/?q=VISTEC+M2+MSE+Rayong",
    isActive: false, // Disabled by default
  },
  {
    id: "loc-m3",
    name: "M3 - BSE (ชีวโมเลกุล)",
    nameEn: "M3 - BSE (Biomolecular Science)",
    nameCn: "M3 - BSE (生物分子科学与工程)",
    shortCode: "M3",
    description: "School of Biomolecular Science & Engineering (อาคาร M3)",
    descriptionEn: "Bldg M3 - School of Biomolecular Science & Engineering",
    descriptionCn: "M3 栋 - 生物分子科学与工程学院",
    deskDetail: "โถงชั้น 1 โต๊ะรับ Delivery อาคาร M3 (BSE)",
    deskDetailEn: "1st Floor Lobby - Bldg M3 Delivery Table",
    deskDetailCn: "一楼大厅 - M3 栋外卖取餐台",
    photoUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
    color: "bg-[#009245]", // VISTEC BSE Emerald Green
    mapUrl: "https://maps.google.com/?q=VISTEC+M3+BSE+Rayong",
    isActive: false, // Disabled by default
  },
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
