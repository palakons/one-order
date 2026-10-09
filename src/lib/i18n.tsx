"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "th" | "en" | "cn";

export const translations = {
  th: {
    // Brand
    brandName: "VEATEC",
    brandSubtitle: "VISTEC Eats • มื้อเที่ยงส่งถึงตึก M4",

    // Navbar
    myOrders: "ออเดอร์ของฉัน",
    dropoffLocation: "จุดรับข้าว (ตึก M4)",
    dropoffShort: "ตึก M4",
    suggestion: "ข้อเสนอแนะ",
    suggestionShort: "ติชม",

    // Home Hero & Steps
    heroTitle: "รวมสั่งอาหารกลางวัน ส่งฟรีถึงโต๊ะตึก M4",
    heroSubtitle: "รวมยอดครบ ฿200 ต่อร้าน ส่งฟรีถึงโต๊ะวางอาหารชั้น 1 ตึก M4 ทุกวันจันทร์–ศุกร์",
    step1: "เลือกร้าน & เมนู",
    step2: "โอน & แนบสลิป",
    step3: "รับข้าวตึก M4",
    activeRoundToday: "รอบสั่งอาหารวันนี้",
    cutoffAt: "ปิดรอบ",
    targetAmount: "เป้าหมายส่งฟรี",
    statusOpen: "เปิดรับออเดอร์",
    statusLocked: "กำลังปรุงอาหาร",
    statusDelivering: "กำลังมาส่ง",
    statusCompleted: "จัดส่งแล้ว",
    freeDeliveryUnlocked: "🎉 ครบขั้นต่ำแล้ว",
    freeDeliveryUnlockedSub: "ส่งฟรีถึงตึกแน่นอน ✅",
    needMore: "ขาดอีก",
    viewMenuOrder: "ดูเมนู & สั่งข้าว",
    deliveryPointBanner: "จุดส่งอาหาร: โต๊ะส่งอาหาร Delivery ชั้น 1 อาคาร M4 (ส่งพร้อมกันทุกร้านช่วง 11:30 - 12:00)",
    ordersCount: "ออเดอร์",
    noOrdersYet: "ยังไม่มีออเดอร์ เป็นคนแรกเลย!",
    orderBoxCount: "{count} กล่อง",
    totalPool: "ยอดรวม",

    // Active order sticky
    foodArrivedM4: "🎉 ข้าวของคุณส่งถึงตึก M4 แล้ว!",
    riderDelivering: "🛵 ไรเดอร์กำลังเดินทางมาส่งที่ตึก M4",
    chefCooking: "👨‍🍳 ร้านกำลังปรุงอาหาร",
    orderSaved: "⏳ ออเดอร์บันทึกแล้ว",
    tapToViewBox: "ป้ายกล่อง: {box} • แตะเพื่อดูรูปถ่าย & ไปรับข้าว ➔",
    tapToViewStatus: "กำลังนำอาหารมาที่โต๊ะรับของชั้น 1 ตึก M4 • แตะดูสถานะ ➔",
    cookingQueue: "ครัวกำลังทำตามคิว • แตะดูสถานะ ➔",
    waitingCutoff: "รอปิดรอบเวลา {time} น. • แตะดูรายละเอียด ➔",

    // Order Page
    backToHome: "กลับหน้าหลัก",
    minimumPoolNotice: "สั่งรวมกันครบ ฿200 ส่งฟรีถึงตึก M4",
    restaurantMenu: "เมนูอาหาร",
    addToCart: "เพิ่มลงกล่อง",
    cartTitle: "รายการของคุณ",
    totalPrice: "ยอดรวม",
    yourInfo: "ข้อมูลผู้สั่ง",
    fullName: "ชื่อ-นามสกุล",
    fullNamePlaceholder: "เช่น Palakon (M4)",
    phoneNumber: "เบอร์โทรศัพท์ (สำหรับค้นหาออเดอร์)",
    phonePlaceholder: "เช่น 081-234-5678",
    buildingRoom: "ตึก / ห้อง / หมายเหตุกล่อง",
    buildingRoomPlaceholder: "เช่น M4 ชั้น 3 ห้อง 302",
    specialNote: "หมายเหตุถึงร้าน (เช่น ไม่ใส่ผัก, เผ็ดน้อย)",
    specialNotePlaceholder: "ระบุข้อความถึงร้าน...",
    paymentTitle: "สแกนชำระเงิน (PromptPay)",
    uploadSlip: "แนบสลิปการโอนเงิน",
    uploadingSlip: "กำลังอัปโหลดสลิป...",
    submitOrder: "ยืนยันและส่งออเดอร์",
    submittingOrder: "กำลังบันทึกออเดอร์...",
    orderSuccess: "สั่งอาหารสำเร็จ!",

    // My Orders Page
    searchOrdersTitle: "ตรวจสอบสถานะออเดอร์ & กล่องข้าว",
    searchOrdersSubtitle: "กรอกเบอร์โทรที่ใช้สั่งเพื่อดูหมายเลขกล่องและรูปถ่ายส่งของที่ตึก M4",
    searchPhonePlaceholder: "กรอกเบอร์โทรศัพท์ เช่น 0812345678",
    searchButton: "ค้นหา",
    todayOrders: "รายการสั่งอาหารวันนี้",
    boxLabel: "หมายเลขกล่อง",
    deliveryProofPhoto: "📸 รูปถ่ายยืนยันการส่งของที่โต๊ะ M4",
    noOrdersFound: "ไม่พบรายการสั่งอาหารสำหรับเบอร์นี้",

    // Suggestion Modal
    feedbackTitle: "💡 ข้อเสนอแนะ / แนะนำร้านค้า",
    feedbackSubtitle: "ช่วยเราพัฒนา VEATEC ให้ดียิ่งขึ้น แจ้งร้านที่อยากให้เพิ่ม หรือติชมระบบได้เลยครับ",
    feedbackCategory: "ประเภทข้อเสนอแนะ",
    categoryShop: "🍱 อยากให้เพิ่มร้าน/เมนู",
    categoryBug: "🐛 แจ้งปัญหาการใช้งาน",
    categoryService: "🛵 จุดส่งอาหาร / ไรเดอร์",
    categoryOther: "💬 ข้อเสนอแนะทั่วไป",
    feedbackName: "ชื่อของคุณ (ไม่ระบุก็ได้)",
    feedbackContact: "เบอร์โทร / LINE ID (ไม่ระบุก็ได้)",
    feedbackMessage: "รายละเอียดข้อเสนอแนะ",
    feedbackPlaceholder: "เช่น อยากให้เพิ่มร้านกาแฟ Lin's ชาเขียว หรือร้านข้าวมันไก่ตอนเที่ยง...",
    feedbackSubmit: "ส่งข้อเสนอแนะ",
    feedbackSubmitting: "กำลังส่ง...",
    feedbackSuccess: "ขอบคุณสำหรับข้อเสนอแนะ! ทีมงานจะนำไปปรับปรุงครับ 🎉",
    close: "ปิด",

    // Desks Modal
    desksTitle: "โต๊ะจุดรับข้าว ตึก M4",
    desksSubtitle: "จุดวางอาหารส่วนกลาง อาคาร M4 (ชั้น 1 โต๊ะวางอาหาร Delivery)",
    desksNotice: "ไรเดอร์จะนำถุง/กล่องอาหารติดชื่อของคุณไปวางส่งที่โต๊ะประจำตึก M4 ตรวจสอบหมายเลขออเดอร์เมื่อมารับ",
  },
  en: {
    // Brand
    brandName: "VEATEC",
    brandSubtitle: "VISTEC Eats • Lunch pooling to Bldg M4",

    // Navbar
    myOrders: "My Orders",
    dropoffLocation: "Pickup Desk (Bldg M4)",
    dropoffShort: "Bldg M4",
    suggestion: "Suggestions",
    suggestionShort: "Feedback",

    // Home Hero & Steps
    heroTitle: "Campus Lunch Food Pooling to Bldg M4",
    heroSubtitle: "Pool orders to ฿200/shop for free delivery directly to 1st Floor Delivery Table, Bldg M4 (Mon–Fri)",
    step1: "Pick Shop & Menu",
    step2: "Pay & Attach Slip",
    step3: "Pickup at Bldg M4",
    activeRoundToday: "Today's Lunch Pools",
    cutoffAt: "Cutoff",
    targetAmount: "Free Delivery Goal",
    statusOpen: "Open for Orders",
    statusLocked: "Cooking",
    statusDelivering: "Delivering",
    statusCompleted: "Delivered",
    freeDeliveryUnlocked: "🎉 Goal Reached!",
    freeDeliveryUnlockedSub: "Delivered to building ✅",
    needMore: "Needs",
    viewMenuOrder: "View Menu & Order",
    deliveryPointBanner: "Pickup Spot: 1st Floor Delivery Table, Bldg M4 (Delivered together around 11:30 - 12:00)",
    ordersCount: "orders",
    noOrdersYet: "No orders yet. Be the first!",
    orderBoxCount: "{count} boxes",
    totalPool: "Pool Total",

    // Active order sticky
    foodArrivedM4: "🎉 Your food has arrived at Bldg M4!",
    riderDelivering: "🛵 Rider is on the way to Bldg M4",
    chefCooking: "👨‍🍳 Kitchen is preparing your food",
    orderSaved: "⏳ Order saved",
    tapToViewBox: "Box: {box} • Tap to view photo & pick up ➔",
    tapToViewStatus: "Food arriving at 1st Floor Bldg M4 • Tap for status ➔",
    cookingQueue: "Kitchen preparing in queue • Tap for status ➔",
    waitingCutoff: "Closing at {time} • Tap for details ➔",

    // Order Page
    backToHome: "Back to Home",
    minimumPoolNotice: "Pool total ฿200 per shop for free delivery to Bldg M4",
    restaurantMenu: "Menu Items",
    addToCart: "Add to Box",
    cartTitle: "Your Items",
    totalPrice: "Total",
    yourInfo: "Contact & Delivery Info",
    fullName: "Full Name",
    fullNamePlaceholder: "e.g. John Doe (M4)",
    phoneNumber: "Phone Number (for tracking)",
    phonePlaceholder: "e.g. 081-234-5678",
    buildingRoom: "Building / Room / Box Tag",
    buildingRoomPlaceholder: "e.g. Bldg M4, 3rd Floor, Room 302",
    specialNote: "Kitchen Note (e.g. No spicy, no cilantro)",
    specialNotePlaceholder: "Special requests for the chef...",
    paymentTitle: "Scan QR to Pay (PromptPay)",
    uploadSlip: "Attach Payment Slip",
    uploadingSlip: "Uploading slip...",
    submitOrder: "Confirm & Place Order",
    submittingOrder: "Placing order...",
    orderSuccess: "Order placed successfully!",

    // My Orders Page
    searchOrdersTitle: "Check Order Status & Box Number",
    searchOrdersSubtitle: "Enter the phone number used when ordering to see your box number and drop-off photo",
    searchPhonePlaceholder: "Enter phone number e.g. 0812345678",
    searchButton: "Search",
    todayOrders: "Today's Orders",
    boxLabel: "Box Number",
    deliveryProofPhoto: "📸 Delivery Proof Photo at Bldg M4",
    noOrdersFound: "No orders found for this phone number today",

    // Suggestion Modal
    feedbackTitle: "💡 Suggestions & Feedback",
    feedbackSubtitle: "Help us make VEATEC better! Request new shops, menu items, or report any issues.",
    feedbackCategory: "Feedback Category",
    categoryShop: "🍱 Request New Shop / Menu",
    categoryBug: "🐛 Report an Issue / Bug",
    categoryService: "🛵 Delivery Desk / Rider",
    categoryOther: "💬 General Suggestion",
    feedbackName: "Your Name (Optional)",
    feedbackContact: "Phone / Contact (Optional)",
    feedbackMessage: "Your Suggestion / Feedback",
    feedbackPlaceholder: "e.g., Would love to have Cafe Amazon or Halal / Vegetarian food options...",
    feedbackSubmit: "Submit Feedback",
    feedbackSubmitting: "Submitting...",
    feedbackSuccess: "Thank you for your feedback! We will review it soon 🎉",
    close: "Close",

    // Desks Modal
    desksTitle: "Pickup Table Bldg M4",
    desksSubtitle: "Central delivery table, Building M4 (1st Floor Delivery Table)",
    desksNotice: "Riders deliver labeled boxes to Bldg M4 tables. Check your box number when picking up.",
  },
  cn: {
    // Brand
    brandName: "VEATEC",
    brandSubtitle: "VISTEC Eats • 午餐拼单直达 M4 栋",

    // Navbar
    myOrders: "我的订单",
    dropoffLocation: "取餐点 (M4栋)",
    dropoffShort: "M4栋",
    suggestion: "意见建议",
    suggestionShort: "建议",

    // Home Hero & Steps
    heroTitle: "VISTEC 校园午餐拼单 免运费直达 M4栋",
    heroSubtitle: "每家店拼单满 ฿200 即免配送费，统一送至 M4 栋一楼外卖取餐台（周一至周五）",
    step1: "选择餐厅与餐品",
    step2: "扫码付款并上传凭证",
    step3: "M4栋一楼自取",
    activeRoundToday: "今日拼单",
    cutoffAt: "截止时间",
    targetAmount: "免运费目标",
    statusOpen: "拼单中",
    statusLocked: "商家制作中",
    statusDelivering: "配送中",
    statusCompleted: "已送达",
    freeDeliveryUnlocked: "🎉 已达免运费目标！",
    freeDeliveryUnlockedSub: "直达 M4 栋 ✅",
    needMore: "还差",
    viewMenuOrder: "查看菜单 & 点餐",
    deliveryPointBanner: "取餐地点：M4 教学楼一楼外卖取餐台（各家餐厅约 11:30 - 12:00 统一送达）",
    ordersCount: "份餐品",
    noOrdersYet: "暂无订单，快来成为今日首单！",
    orderBoxCount: "{count} 份",
    totalPool: "拼单总额",

    // Active order sticky
    foodArrivedM4: "🎉 您的餐点已送达 M4 栋！",
    riderDelivering: "🛵 骑手正在配送至 M4 栋",
    chefCooking: "👨‍🍳 餐厅正在为您准备餐品",
    orderSaved: "⏳ 订单已提交",
    tapToViewBox: "餐盒编号: {box} • 点击查看送达照片 & 前往取餐 ➔",
    tapToViewStatus: "餐品正在送往 M4 栋一楼取餐台 • 点击查看 ➔",
    cookingQueue: "厨房正在按顺序制作 • 点击查看 ➔",
    waitingCutoff: "截止时间 {time} • 点击查看详情 ➔",

    // Order Page
    backToHome: "返回首页",
    minimumPoolNotice: "同店拼单满 ฿200 免配送费直达 M4 栋",
    restaurantMenu: "餐品菜单",
    addToCart: "加入餐盒",
    cartTitle: "已选餐品",
    totalPrice: "合计金额",
    yourInfo: "订餐人信息",
    fullName: "姓名",
    fullNamePlaceholder: "例如: Zhang San (M4)",
    phoneNumber: "手机号码（用于查询订单）",
    phonePlaceholder: "例如: 081-234-5678",
    buildingRoom: "楼栋 / 实验室 / 餐盒备注",
    buildingRoomPlaceholder: "例如: M4栋 3楼 302室",
    specialNote: "口味备注（如：免辣、免香菜）",
    specialNotePlaceholder: "填写给餐厅的特殊要求...",
    paymentTitle: "扫码支付 (PromptPay)",
    uploadSlip: "上传转账付款凭证",
    uploadingSlip: "正在上传凭证...",
    submitOrder: "确认并提交订单",
    submittingOrder: "正在提交订单...",
    orderSuccess: "下单成功！",

    // My Orders Page
    searchOrdersTitle: "查询订单状态与餐盒号",
    searchOrdersSubtitle: "输入下单时的手机号码，即可查询餐盒编号及 M4 栋送达照片",
    searchPhonePlaceholder: "输入手机号，如 0812345678",
    searchButton: "查询",
    todayOrders: "今日订单列表",
    boxLabel: "餐盒编号",
    deliveryProofPhoto: "📸 M4 栋送达确认照片",
    noOrdersFound: "未查询到此手机号今日的订餐记录",

    // Suggestion Modal
    feedbackTitle: "💡 意见反馈与建议",
    feedbackSubtitle: "帮助我们改进 VEATEC！欢迎推荐想吃的美食、新餐厅或反馈问题。",
    feedbackCategory: "反馈类型",
    categoryShop: "🍱 推荐新店 / 新菜品",
    categoryBug: "🐛 遇到系统问题",
    categoryService: "🛵 取餐台 / 配送服务",
    categoryOther: "💬 其他建议",
    feedbackName: "您的称呼（选填）",
    feedbackContact: "联系方式 / 微信 / 电话（选填）",
    feedbackMessage: "具体建议或反馈内容",
    feedbackPlaceholder: "例如：希望能增加 Cafe Amazon 或清真/素食选择...",
    feedbackSubmit: "提交建议",
    feedbackSubmitting: "正在提交...",
    feedbackSuccess: "感谢您的宝贵建议！我们将持续优化服务 🎉",
    close: "关闭",

    // Desks Modal
    desksTitle: "M4 栋取餐台",
    desksSubtitle: "M4 教学楼一楼外卖集中放置区",
    desksNotice: "骑手会将贴有您姓名的餐盒送至 M4 取餐台，取餐时请核对您的餐盒编号。",
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: typeof translations.th;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "th",
  setLang: () => {},
  t: translations.th,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("th");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("veatec_lang") as Language;
      if (saved && (saved === "th" || saved === "en" || saved === "cn")) {
        setLangState(saved);
      }
    } catch (e) {
      console.warn("Could not read language from localStorage", e);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem("veatec_lang", newLang);
    } catch (e) {}
  };

  const t = translations[lang] || translations.th;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
