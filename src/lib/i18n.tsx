"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Shop } from "./types";

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
    deliveryPointBanner: "จุดส่งอาหาร: อาคาร M4 ชั้น 1 (ส่งพร้อมกันทุกร้านช่วง 11:30 - 12:00)",
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

    // Live Whiteboard & Modals
    openNewBoard: "+ เปิดกระดานใหม่",
    archivedBoards: "กระดานเก่า",
    backToLive: "กลับกระดานสด",
    viewingArchivedBanner: "กำลังดูกระดานเก่า",
    readOnlyNotice: "ปิดรับออเดอร์แล้ว (Read-Only)",
    noLiveBoards: "ไม่มีกระดานเปิดรับออเดอร์ในขณะนี้",
    noLiveBoardsSub: "กระดานของวันนี้อาจยังไม่ได้เปิด หรือรอบสั่งทั้งหมดเสร็จสิ้นแล้ว",
    viewArchivedInArchive: "ดูกระดานเก่าในคลัง",
    orderDate: "รอบวันที่",
    leader: "หัวหน้าตี้",
    noLeader: "ยังไม่มีหัวหน้าตี้",
    manageBoard: "จัดการกระดาน ↗",
    sentToShopBadge: "🚀 ส่งร้านแล้ว",
    selfPickupBadge: "🚶 รับเอง",
    selfPickupFull: "🚶 รับเองหน้าร้าน",
    dropoffPoint: "จุดส่ง",
    floor1: "ชั้น 1",
    viewMenuMaps: "ดูเมนูจาก Maps ↗",
    viewShopPromptPay: "💳 ดู QR พร้อมเพย์ร้าน",
    currentTotal: "ยอดรวมตอนนี้",
    boxesCount: "กล่อง",
    freeGoalReached: "🎉 ครบยอดส่งฟรีแล้ว!",
    needMoreToFree: "ขาดอีก ฿{amount} เพื่อส่งฟรี",
    boardTitle: "กระดานออเดอร์ร้าน",
    realtimeUpdate: "อัปเดตเรียลไทม์",
    noOneOnBoard: "ยังไม่มีใครลงชื่อบนกระดานนี้",
    beFirstOnBoard: "เป็นคนแรกที่เปิดตี้ร้านนี้ได้เลยด้านล่าง!",
    callLeader: "โทร",

    // Table Headers
    thNumber: "#",
    thCustomer: "ผู้สั่ง (LINE ID)",
    thDish: "รายการอาหาร",
    thPrice: "ราคา",
    thSlip: "สลิป",
    viewSlip: "ดูสลิป ✓",
    waitingSlip: "รอสลิป",
    paid: "โอนแล้ว",
    cancelOrderTitle: "ยกเลิกออเดอร์นี้",

    // Form
    formTitle: "ลงชื่อสั่งอาหารร้าน",
    formSubtitle: "พิมพ์เมนูที่คุณอยากกิน แล้วแนบสลิปเพื่อขึ้นกระดาน",
    lineIdLabel: "LINE ID หรือชื่อคุณ",
    lineIdPlaceholder: "เช่น Golf หรือ @golf_123",
    phoneLabel: "เบอร์โทรศัพท์ (ร้านโทรหาเมื่อมีปัญหา)",
    phoneNote: "กรณีของหมด",
    dishNameLabel: "เมนูที่ต้องการสั่ง (พิมพ์อิสระ)",
    dishNamePlaceholder: "เช่น ข้าวกะเพราหมูกรอบ ไข่ดาวไม่สุก",
    popularDishes: "เมนูแนะนำ:",
    dishPriceLabel: "ราคา (฿)",
    dishPricePlaceholder: "เช่น 60",
    dishNoteLabel: "หมายเหตุ (ถ้ามี)",
    dishNotePlaceholder: "เช่น ไม่ใส่ผักชี, พิเศษ",
    slipLabel: "แนบสลิปโอนเงิน (Force Transfer)",
    slipScanAuto: "สแกน QR บนสลิปอัตโนมัติ",
    slipScanning: "กำลังสแกน QR Code ตรวจสอบสลิปธนาคาร...",
    slipVerified: "✓ ตรวจพบสลิปธนาคาร",
    slipRef: "รหัสสลิป (Ref):",
    slipAttached: "📷 แนบรูปสลิปเรียบร้อยแล้ว",
    slipNote: "ตรวจไม่พบ QR Code อัตโนมัติ — สามารถกดบันทึกออเดอร์ได้ตามปกติ",
    submitToWhiteboard: "+ ลงชื่อบนไวท์บอร์ด (บันทึกออเดอร์)",
    submittingToWhiteboard: "กำลังบันทึกลงกระดาน...",
    boardClosedNotice: "🔴 รอบสั่งอาหารนี้ปิดรับแล้ว (หมดเวลา Cutoff)",
    boardArchiveNotice: "📦 กระดานนี้เป็นคลังประวัติ (ปิดรอบแล้ว - อ่านอย่างเดียว)",
    switchToLiveToday: "สลับไปสั่งอาหารบนกระดานสดวันนี้ ↗",

    // PromptPay Modal
    promptPayModalTitle: "QR พร้อมเพย์ร้านค้า",
    accountName: "ชื่อบัญชี:",
    copyPromptPay: "คัดลอกหมายเลขพร้อมเพย์",
    copiedPromptPay: "คัดลอกเบอร์พร้อมเพย์แล้ว!",

    // Archive Modal
    archiveModalTitle: "คลังกระดานเก่า (Archived Boards)",
    archiveModalSub: "กระดานที่ปิดรับออเดอร์แล้ว หรือรอบวันก่อนหน้า",
    noArchivedBoards: "ยังไม่มีกระดานเก่าในคลัง",
    allActiveLive: "ทุกกระดานในปัจจุบันยังเปิดเป็น Live Board",
    viewBoard: "เปิดดูกระดาน",
    viewDeliveryPhoto: "ดูรูปส่ง",
    kitchenSheet: "Kitchen Sheet",
    closeWindow: "ปิดหน้าต่าง",
    roundCompleted: "ส่งแล้ว ✅",
    roundCancelled: "ยกเลิกแล้ว",
    roundClosed: "ปิดรอบแล้ว",

    // Open Board Modal
    openBoardTitle: "เปิดกระดานรวมออเดอร์ใหม่",
    openBoardSubtitle: "เลือกตึกปลายทางและร้านอาหารเพื่อเริ่มตี้อาหารประจำวัน",
    stepShop: "1. เลือกร้านอาหารที่ต้องการสั่ง",
    stepBuilding: "2. เลือกตึกส่งอาหาร (Building Destination)",
    buildingRiderNotice: "📍 ไรเดอร์และร้านค้าจะมาส่งที่โต๊ะส่งอาหารของตึกที่เลือกนี้",
    stepLeader: "3. ข้อมูลผู้เปิดตี้ / หัวหน้าตี้ (Leader Contact)",
    leaderName: "ชื่อ / LINE ID",
    leaderPhone: "เบอร์โทรศัพท์",
    leaderPin: "PIN หัวหน้าตี้ 4 หลัก (สำหรับปิดรอบ/ส่งร้าน)",
    leaderPinHint: "ค่าเริ่มต้น: 4 ตัวท้ายเบอร์โทร",
    leaderPinDesc: "💡 ระบบจะจำ PIN นี้ไว้ในเครื่องคุณอัตโนมัติ (ป้องกันไม่ให้ผู้อื่นปิดกระดานหรือส่งร้านแทนคุณ)",
    leaderPhoneHelp: "เบอร์โทรจะแสดงบนหัวกระดานและใบเสร็จยาว เพื่อให้ร้านค้าหรือไรเดอร์โทรติดต่อเมื่อมีปัญหา",
    stepCutoff: "เวลาปิดรับ (Cutoff)",
    stepTargetMin: "เป้ายอดขั้นต่ำ (฿)",
    stepNotes: "หมายเหตุเพิ่มเติม (Notes / ปล.)",
    stepNotesPlaceholder: "เช่น โอนเงินพร้อมแนบสลิปทันที / อาหารมาส่งวางไว้ที่โต๊ะ",
    cancel: "ยกเลิก",
    openBoardButton: "เปิดกระดานทันที",
    openingBoard: "กำลังเปิดกระดาน...",

    // Leader Portal
    leaderPortalTitle: "เข้าสู่ระบบหัวหน้าตี้",
    leaderPortalSubtitle: "แผงควบคุมหัวหน้าตี้ (Leader Portal)",
    enterPinTitle: "Host PIN (4 หลัก)",
    pinPlaceholder: "เช่น 1234",
    verifyAndLogin: "เข้าสู่ระบบหัวหน้าตี้",
    loggingIn: "กำลังตรวจสอบ...",
    selfPickupToggle: "โหมดรับเองหน้าร้าน (Self-Pickup)",
    selfPickupToggleDesc: "เปิดเมื่อยอดไม่ถึงขั้นต่ำ แล้วจะไปรับอาหารเองที่ร้าน",
    generateLongManifest: "สร้างภาพสรุปยาวส่งร้าน (One Long Slip)",
    generatingManifest: "กำลังสร้างภาพสรุปยาว...",
    markSentToShop: "บันทึกส่งร้านแล้ว (ปิดรอบ)",
    membersPhoneDir: "สมุดโทรศัพท์สมาชิกในตี้ (เฉพาะหัวหน้าตี้)",
    membersPhoneDirDesc: "สำหรับโทรติดต่อกรณีเมนูหมด หรือไรเดอร์มาถึงแล้ว",
    callMember: "โทร",
    oneLongManifestTitle: "สรุปออเดอร์ส่งร้าน (Send to Shop)",
    oneLongManifestSub: "สร้างภาพสรุปยาวใบเดียว ฝังสลิปครบทุกกล่อง",
    manifestSuccess: "สร้างภาพยาวสำเร็จ! (มีรายการอาหาร จุดส่ง และสลิปทุกใบในรูปเดียว)",
    summaryForChat: "ข้อความสรุปสำหรับส่งในแชต:",
    copyText: "คัดลอกข้อความ",
    copiedText: "✓ คัดลอกแล้ว",
    shareToLineNow: "แชร์เข้า LINE ร้านทันที",
    saveLongImage: "บันทึกรูปยาว",
    backToWhiteboard: "กลับหน้ากระดาน",
    logout: "ออกจากระบบหัวหน้าตี้",
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

    // Live Whiteboard & Modals
    openNewBoard: "+ Open New Board",
    archivedBoards: "Archived Boards",
    backToLive: "Back to Live Board",
    viewingArchivedBanner: "Viewing Archived Board",
    readOnlyNotice: "Closed (Read-Only)",
    noLiveBoards: "No active order boards right now",
    noLiveBoardsSub: "Today's boards haven't opened yet, or all rounds are finished.",
    viewArchivedInArchive: "View Archived Boards in Archive",
    orderDate: "Date",
    leader: "Leader",
    noLeader: "No leader assigned",
    manageBoard: "Manage Board ↗",
    sentToShopBadge: "🚀 Sent to Shop",
    selfPickupBadge: "🚶 Self-Pickup",
    selfPickupFull: "🚶 Pick up at Shop",
    dropoffPoint: "Drop-off",
    floor1: "1st Floor",
    viewMenuMaps: "View Menu on Maps ↗",
    viewShopPromptPay: "💳 View Shop QR",
    currentTotal: "Current Total",
    boxesCount: "boxes",
    freeGoalReached: "🎉 Free delivery goal reached!",
    needMoreToFree: "฿{amount} more for free delivery",
    boardTitle: "Order Board:",
    realtimeUpdate: "Real-time updates",
    noOneOnBoard: "No one has joined this board yet",
    beFirstOnBoard: "Be the first to join this board below!",
    callLeader: "Call",

    // Table Headers
    thNumber: "#",
    thCustomer: "Customer (LINE ID)",
    thDish: "Items / Dishes",
    thPrice: "Price",
    thSlip: "Slip",
    viewSlip: "View Slip ✓",
    waitingSlip: "Pending Slip",
    paid: "Paid",
    cancelOrderTitle: "Cancel this order",

    // Form
    formTitle: "Join Order for",
    formSubtitle: "Type your meal and attach transfer slip to join the whiteboard",
    lineIdLabel: "LINE ID or Your Name",
    lineIdPlaceholder: "e.g. Golf or @golf_123",
    phoneLabel: "Phone Number (Shop calls if any issue)",
    phoneNote: "If out of stock",
    dishNameLabel: "Dish / Meal Name (Free text)",
    dishNamePlaceholder: "e.g. Crispy pork basil rice, fried egg",
    popularDishes: "Recommended:",
    dishPriceLabel: "Price (฿)",
    dishPricePlaceholder: "e.g. 60",
    dishNoteLabel: "Kitchen Note (Optional)",
    dishNotePlaceholder: "e.g. No cilantro, spicy",
    slipLabel: "Attach Payment Slip (Force Transfer)",
    slipScanAuto: "Auto-scanning QR on slip",
    slipScanning: "Scanning bank slip QR Code...",
    slipVerified: "✓ Bank slip verified:",
    slipRef: "Slip Ref:",
    slipAttached: "📷 Payment slip attached",
    slipNote: "QR Code not auto-detected — you can still proceed to place order",
    submitToWhiteboard: "+ Add to Whiteboard (Confirm Order)",
    submittingToWhiteboard: "Adding to whiteboard...",
    boardClosedNotice: "🔴 Order round closed (Cutoff reached)",
    boardArchiveNotice: "📦 This board is in archive (Closed - Read only)",
    switchToLiveToday: "Switch to today's active boards ↗",

    // PromptPay Modal
    promptPayModalTitle: "Shop PromptPay QR",
    accountName: "Account Name:",
    copyPromptPay: "Copy PromptPay Number",
    copiedPromptPay: "PromptPay number copied!",

    // Archive Modal
    archiveModalTitle: "Archived Boards",
    archiveModalSub: "Closed rounds and previous days",
    noArchivedBoards: "No archived boards yet",
    allActiveLive: "All current boards are actively open",
    viewBoard: "View Board",
    viewDeliveryPhoto: "Drop-off Photo",
    kitchenSheet: "Kitchen Sheet",
    closeWindow: "Close",
    roundCompleted: "Delivered ✅",
    roundCancelled: "Cancelled",
    roundClosed: "Closed",

    // Open Board Modal
    openBoardTitle: "Open New Order Board",
    openBoardSubtitle: "Select destination building and restaurant to start daily food pool",
    stepShop: "1. Choose Restaurant",
    stepBuilding: "2. Select Delivery Building",
    buildingRiderNotice: "📍 Riders and shop will deliver to this building's delivery desk",
    stepLeader: "3. Leader Contact Info",
    leaderName: "Name / LINE ID",
    leaderPhone: "Phone Number",
    leaderPin: "Leader 4-Digit PIN (to close & send)",
    leaderPinHint: "Default: Last 4 digits of phone",
    leaderPinDesc: "💡 Saved on your device automatically (prevents unauthorized closing)",
    leaderPhoneHelp: "Phone number will be shown on board and manifest for shop/rider to contact",
    stepCutoff: "Cutoff Time",
    stepTargetMin: "Minimum Pool (฿)",
    stepNotes: "Additional Notes (Optional)",
    stepNotesPlaceholder: "e.g. Please transfer with slip immediately / Leave at table",
    cancel: "Cancel",
    openBoardButton: "Open Board Now",
    openingBoard: "Opening board...",

    // Leader Portal
    leaderPortalTitle: "Leader Login",
    leaderPortalSubtitle: "Leader Management Portal",
    enterPinTitle: "Host PIN (4 Digits)",
    pinPlaceholder: "e.g. 1234",
    verifyAndLogin: "Login to Leader Portal",
    loggingIn: "Verifying...",
    selfPickupToggle: "Self-Pickup Mode",
    selfPickupToggleDesc: "Enable if minimum not reached and you will pick up at shop",
    generateLongManifest: "Generate One Long Manifest for Shop",
    generatingManifest: "Generating long manifest...",
    markSentToShop: "Mark as Sent to Shop (Close Round)",
    membersPhoneDir: "Member Phone Directory (Leader Only)",
    membersPhoneDirDesc: "To contact members if items are out of stock or food has arrived",
    callMember: "Call",
    oneLongManifestTitle: "Order Summary for Shop (Send to Shop)",
    oneLongManifestSub: "Generates one long manifest with all dish details and slips embedded",
    manifestSuccess: "Long manifest generated! (Includes items, drop-off spot, and all slips in one image)",
    summaryForChat: "Text summary for messaging chat:",
    copyText: "Copy Text",
    copiedText: "✓ Copied",
    shareToLineNow: "Share to Shop via LINE",
    saveLongImage: "Download Long Image",
    backToWhiteboard: "Back to Whiteboard",
    logout: "Log Out",
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

    // Live Whiteboard & Modals
    openNewBoard: "+ 发起新拼单",
    archivedBoards: "历史拼单",
    backToLive: "返回实时拼单",
    viewingArchivedBanner: "正在查看历史拼单",
    readOnlyNotice: "已截止 (仅供查看)",
    noLiveBoards: "暂无开启中的拼单",
    noLiveBoardsSub: "今日拼单尚未开启，或所有轮次已结束。",
    viewArchivedInArchive: "查看归档中的历史拼单",
    orderDate: "拼单日期",
    leader: "拼单发起人",
    noLeader: "暂无发起人",
    manageBoard: "管理拼单 ↗",
    sentToShopBadge: "🚀 已提交给商家",
    selfPickupBadge: "🚶 到店自取",
    selfPickupFull: "🚶 到店自取",
    dropoffPoint: "取餐地点",
    floor1: "一楼",
    viewMenuMaps: "在 Maps 查看菜单 ↗",
    viewShopPromptPay: "💳 查看商家收款码",
    currentTotal: "当前总计",
    boxesCount: "份",
    freeGoalReached: "🎉 已达免配送费标准！",
    needMoreToFree: "还差 ฿{amount} 免配送费",
    boardTitle: "拼单列表：",
    realtimeUpdate: "实时更新",
    noOneOnBoard: "暂无人在本榜单点餐",
    beFirstOnBoard: "快在下方抢先加入本单！",
    callLeader: "电话",

    // Table Headers
    thNumber: "#",
    thCustomer: "点餐人 (LINE ID)",
    thDish: "餐品明细",
    thPrice: "价格",
    thSlip: "转账凭证",
    viewSlip: "查看凭证 ✓",
    waitingSlip: "待传凭证",
    paid: "已付款",
    cancelOrderTitle: "取消此订单",

    // Form
    formTitle: "登记点餐：",
    formSubtitle: "输入想吃的餐品并附上付款截图即可上榜",
    lineIdLabel: "LINE ID 或您的姓名",
    lineIdPlaceholder: "例如: Golf 或 @golf_123",
    phoneLabel: "手机号码 (餐品缺货时商家联络)",
    phoneNote: "如遇售罄",
    dishNameLabel: "想点的餐品 (自由输入)",
    dishNamePlaceholder: "例如: 打抛脆皮烧肉饭、荷包蛋",
    popularDishes: "推荐菜品:",
    dishPriceLabel: "价格 (฿)",
    dishPricePlaceholder: "例如: 60",
    dishNoteLabel: "口味备注 (选填)",
    dishNotePlaceholder: "例如: 不加香菜、微辣",
    slipLabel: "上传转账凭证 (Force Transfer)",
    slipScanAuto: "自动识别凭证二维码",
    slipScanning: "正在识别银行二维码...",
    slipVerified: "✓ 已核实银行凭证:",
    slipRef: "流水号 (Ref):",
    slipAttached: "📷 凭证已上传",
    slipNote: "未自动识别出二维码 — 仍可正常提交订单",
    submitToWhiteboard: "+ 登记上榜 (确认下单)",
    submittingToWhiteboard: "正在登记上榜...",
    boardClosedNotice: "🔴 本轮订餐已截止 (已过截止时间)",
    boardArchiveNotice: "📦 此拼单为历史归档 (已关闭 - 仅供查看)",
    switchToLiveToday: "切换至今日实时拼单 ↗",

    // PromptPay Modal
    promptPayModalTitle: "商家 PromptPay 收款码",
    accountName: "账户名：",
    copyPromptPay: "复制收款账号",
    copiedPromptPay: "收款账号已复制！",

    // Archive Modal
    archiveModalTitle: "历史拼单归档",
    archiveModalSub: "已关闭或往日的拼单记录",
    noArchivedBoards: "暂无历史拼单",
    allActiveLive: "当前所有拼单均为活跃状态",
    viewBoard: "查看拼单",
    viewDeliveryPhoto: "送达照片",
    kitchenSheet: "后厨单 (Kitchen Sheet)",
    closeWindow: "关闭",
    roundCompleted: "已送达 ✅",
    roundCancelled: "已取消",
    roundClosed: "已截止",

    // Open Board Modal
    openBoardTitle: "发起新拼单",
    openBoardSubtitle: "选择送达教学楼与餐厅以开启今日午餐拼单",
    stepShop: "1. 选择拼单餐厅",
    stepBuilding: "2. 选择送达楼栋",
    buildingRiderNotice: "📍 骑手及商家将送达至该楼栋的外卖取餐台",
    stepLeader: "3. 发起人联络信息",
    leaderName: "姓名 / LINE ID",
    leaderPhone: "手机号码",
    leaderPin: "4位数发起人PIN码 (用于提交商家)",
    leaderPinHint: "默认：手机后4位",
    leaderPinDesc: "💡 系统将在本机自动记住该PIN码 (防止他人误关拼单)",
    leaderPhoneHelp: "电话将显示在拼单及总账单上，便于商家与骑手联络",
    stepCutoff: "截止时间",
    stepTargetMin: "免运费门槛 (฿)",
    stepNotes: "补充备注 (选填)",
    stepNotesPlaceholder: "例如: 请下单即转账并附凭证 / 送达放在桌上",
    cancel: "取消",
    openBoardButton: "立即开启拼单",
    openingBoard: "正在开启...",

    // Leader Portal
    leaderPortalTitle: "发起人登录",
    leaderPortalSubtitle: "发起人管理面板",
    enterPinTitle: "Host PIN (4 位数)",
    pinPlaceholder: "例如: 1234",
    verifyAndLogin: "登录管理面板",
    loggingIn: "正在验证...",
    selfPickupToggle: "到店自取模式",
    selfPickupToggleDesc: "当未达免运标准且决定自行到店取餐时开启",
    generateLongManifest: "生成发给商家的长图订单",
    generatingManifest: "正在生成长图订单...",
    markSentToShop: "标记已发给商家 (关闭拼单)",
    membersPhoneDir: "本单订餐人员电话 (仅发起人可见)",
    membersPhoneDirDesc: "便于餐品售罄或骑手到达时联络点餐人",
    callMember: "拨打",
    oneLongManifestTitle: "提交给商家的订单汇总",
    oneLongManifestSub: "自动生成包含所有餐品及转账凭证的长图",
    manifestSuccess: "长图订单生成成功！(包含菜品、送达地点及所有转账凭证)",
    summaryForChat: "用于发送给商家的文字摘要：",
    copyText: "复制文字",
    copiedText: "✓ 已复制",
    shareToLineNow: "立即分享至商家 LINE",
    saveLongImage: "保存长图",
    backToWhiteboard: "返回拼单列表",
    logout: "退出管理",
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

export function getShopLocalizedInfo(shop: Shop, lang: Language) {
  const knownShops: Record<
    string,
    {
      name: { th: string; en: string; cn: string };
      cuisine: { th: string; en: string; cn: string };
      desc: { th: string; en: string; cn: string };
    }
  > = {
    "shop-pa-tai": {
      name: {
        th: "ครัวป้าต่าย ป่ายุบใน",
        en: "Krua Pa Tai (Payubnai)",
        cn: "泰阿姨家常菜 (Krua Pa Tai)",
      },
      cuisine: {
        th: "อาหารตามสั่งพื้นบ้าน / รักษ์ระยอง",
        en: "Thai Stir-Fry & Basil Rice",
        cn: "泰式现炒快餐 / 罗勇风味",
      },
      desc: {
        th: "ร้านอาหารตามสั่งขวัญใจชุมชนป่ายุบใน ใกล้ VISTEC รสจัดจ้าน ให้เยอะ",
        en: "Local favorite stir-fry restaurant near VISTEC, generous portions",
        cn: "VISTEC 附近高人气泰式小炒快餐，分量实在口味正宗",
      },
    },
    "shop-chao-rai": {
      name: {
        th: "ร้านอาหารชาวไร่ วังจันทร์",
        en: "Chao Rai Restaurant (Wangchan)",
        cn: "朝莱海鲜餐厅 (Chao Rai)",
      },
      cuisine: {
        th: "อาหารไทย-จีน & ทะเลกว่า 30 ปี",
        en: "Thai-Chinese Seafood (30+ yrs)",
        cn: "30年老字号 泰中海鲜与特色菜",
      },
      desc: {
        th: "ร้านอาหารระดับตำนาน อ.วังจันทร์ วัตถุดิบทะเลสด อาหารป่ารสจัด",
        en: "Legendary restaurant in Wangchan with fresh seafood and crab rolls",
        cn: "旺赞县知名传统餐厅，新鲜海鲜与招牌蟹肉卷",
      },
    },
    "shop-krua-mangmee": {
      name: {
        th: "ครัวมั่งมี วังจันทร์ (กม.68)",
        en: "Krua Mangmee (KM.68)",
        cn: "芒咪家常餐厅 (Krua Mangmee)",
      },
      cuisine: {
        th: "อาหารไทย-จีน & ข้าวแห้งทะเล",
        en: "Thai-Chinese & Dry Seafood Rice",
        cn: "泰中家常菜 & 海鲜干泡饭",
      },
      desc: {
        th: "ร้านดังประจำ ต.ป่ายุบใน กม.68 ข้าวแห้งทะเลทรงเครื่อง ปลาพิโรธ",
        en: "Famous local eatery known for signature dry seafood rice bowls",
        cn: "当地特色家常风味，招牌海鲜干泡饭与香辣鱼",
      },
    },
    "shop-khun-som": {
      name: {
        th: "ครัวคุณส้ม สี่แยกป่ายุบใน",
        en: "Krua Khun Som (Payubnai)",
        cn: "坤橘泰东北风味 (Krua Khun Som)",
      },
      cuisine: {
        th: "ส้มตำ อาหารอีสาน & จานด่วนแซ่บ",
        en: "Som Tum & Isan Spicy Delights",
        cn: "青木瓜沙拉 & 泰东北风味快餐",
      },
      desc: {
        th: "ร้านแซ่บติดรั้ววังจันทร์ ส้มตำนัว คอหมูย่างฉ่ำ ลาบหมูคั่ว",
        en: "Authentic spicy Isan food: Papaya salad, grilled pork neck, larb",
        cn: "正宗泰东北美食：青木瓜沙拉、炭烤猪颈肉、香辣肉碎",
      },
    },
    "shop-lins-tea": {
      name: {
        th: "Lin's Tea House & Eatery",
        en: "Lin's Tea House & Cafe",
        cn: "林氏茶舍 (Lin's Tea House & Cafe)",
      },
      cuisine: {
        th: "ชา กาแฟสด & เบเกอรี่โฮมเมด",
        en: "Premium Tea, Coffee & Bakery",
        cn: "精选茶饮、现磨咖啡与自制烘焙",
      },
      desc: {
        th: "คาเฟ่มินิมอล อ.วังจันทร์ ชาพรีเมียม กาแฟสดหอมกรุ่น และขนมปังโฮมเมด",
        en: "Popular Wangchan cafe serving specialty teas, coffees and toast",
        cn: "旺赞人气极简风咖啡馆，精选茶饮与自制烘焙甜点",
      },
    },
  };

  const known = knownShops[shop.id];
  if (known) {
    return {
      name: known.name[lang] || shop.name,
      cuisine: known.cuisine[lang] || shop.cuisine,
      description: known.desc[lang] || shop.description,
    };
  }

  // Fallback for custom onboarded shops
  let name = shop.name;
  if (lang === "en" && shop.nameEn) name = shop.nameEn;
  if (lang === "cn") name = (shop as any).nameCn || shop.nameEn || shop.name;

  let cuisine = shop.cuisine;
  if (lang === "en" && (shop as any).cuisineEn) cuisine = (shop as any).cuisineEn;
  if (lang === "cn") cuisine = (shop as any).cuisineCn || (shop as any).cuisineEn || shop.cuisine;

  return { name, cuisine, description: shop.description };
}

export function getMenuItemLocalizedName(
  item: { name: string; nameEn?: string; nameCn?: string },
  lang: Language
): string {
  if (lang === "en") return item.nameEn || item.name;
  if (lang === "cn") {
    if (item.nameCn) return item.nameCn;
    const cnMap: Record<string, string> = {
      // Krua Pa Tai
      "ข้าวกะเพราหมูกรอบคั่วพริกแห้ง": "干辣椒脆皮烧肉打抛猪肉盖饭",
      "ข้าวหมูกระเทียมพริกไทยสด": "鲜胡椒蒜香猪肉盖饭",
      "ข้าวผัดพริกแกงหมูป่าหน่อไม้ดอง": "酸笋红咖喱野猪肉炒饭",
      "ข้าวกะเพราไก่บ้านรสเด็ด": "秘制土鸡肉打抛盖饭",
      "ข้าวผัดโบราณหมูนุ่ม": "传统风味嫩猪肉炒饭",
      "ข้าวไข่เจียวหมูสับฟูกรอบ": "香脆肉碎煎蛋盖饭",
      "ต้มยำไก่บ้านน้ำใส (กับข้าว)": "清汤土鸡冬阴功汤 (配菜)",
      "ผัดซีอิ๊วหมูเส้นใหญ่": "泰式酱油炒宽粉 (猪肉)",
      "ไข่ดาวฟูกรอบ": "香脆荷包蛋 (加单)",

      // Chao Rai
      "หอยจ๊อปูทอดกรอบเนื้อแน่น (จาน 5 ลูก)": "鲜炸饱满蟹肉卷 (5粒)",
      "ข้าวผัดเนื้อปูแกะสด": "鲜拆纯蟹肉炒饭",
      "ข้าวราดเนื้อปูผัดผงกะหรี่": "黄咖喱炒纯蟹肉盖饭",
      "ข้าวหมูป่าผัดเผ็ดเครื่องแกงชาวไร่": "农夫香辣野猪肉咖喱饭",
      "แกงป่าปลาเห็ดโคนราดข้าว": "野味沙丁鱼丛林咖喱盖饭",
      "แฮ่กึ้นกุ้งทอดสูตรชาวไร่ (จานเดี่ยว)": "秘制酥脆炸虾卷 (单盘)",
      "ข้าวออส่วนหอยนางรมราดข้าว": "鲜嫩生蚝蚵仔煎蛋盖饭",
      "ข้าวไข่เจียวเนื้อปูฟูกรอบ": "纯蟹肉香脆煎蛋盖饭",

      // Krua Mangmee
      "ข้าวแห้งทะเลทรงเครื่อง (Signature)": "招牌海鲜干泡饭 (Signature)",
      "ข้าวราดปลาพิโรธผัดฉ่าสูตรเด็ด": "秘制火爆香辣脆鱼盖饭",
      "กระเพาะปลาผัดแห้งเนื้อปู": "蟹肉炒干鱼肚",
      "สุกี้โบราณแห้งทะเลรวมมิตร": "传统古法海鲜炒寿喜干粉",
      "ข้าวผัดกุ้งสดเนื้อเด้ง": "Q弹鲜虾仁炒饭",
      "ทอดมันกุ้งกรอบ (4 ชิ้น)": "香脆泰式金钱虾饼 (4块)",
      "ต้มยำรวมมิตรทะเลน้ำข้น (กับข้าว)": "浓汤海鲜什锦冬阴功汤 (配菜)",
      "ข้าวไข่ตุ๋นทะเลทรงเครื่อง": "什锦海鲜嫩滑蒸蛋盖饭",

      // Khun Som
      "ส้มตำไทยไข่เค็ม": "泰式咸蛋青木瓜沙拉",
      "ส้มตำปูปลาร้านัวแซ่บ": "腌蟹发酵鱼露浓郁青木瓜沙拉",
      "คอหมูย่างเตาถ่านน้ำจิ้มแจ่ว (จานเดี่ยว)": "炭火烤猪颈肉配泰北酸辣酱",
      "ลาบหมูคั่วข้าวคั่วหอมมะนาวแท้": "香烤碎米纯柠檬炒肉碎 (Larb)",
      "ข้าวกะเพราเป็ดพะโล้ผัดกะเพรากรอบ": "脆罗勒卤鸭肉打抛盖饭",
      "ข้าวผัดต้มยำทะเลแซ่บ": "香辣海鲜冬阴功炒饭",
      "ต้มแซ่บกระดูกหมูอ่อน (กับข้าว)": "酸辣软排骨清汤 (配菜)",
      "ข้าวเหนียวนุ่มร้อนๆ": "热腾腾软糯泰式糯米饭",

      // Lin's Tea House
      "Lin's Cold Brew Specialty": "林氏特调冷萃咖啡",
      "Premium Kyoto Matcha Latte": "京都特级抹茶拿铁",
      "Dirty Coffee (Fresh Wangchan Milk)": "旺赞鲜奶 Dirty 脏咖啡",
      "Peach Earl Grey Iced Tea": "白桃格雷红茶冰饮",
      "Yuzu Espresso Sparkling": "日本柚子气泡浓缩咖啡",
      "Thai Tea Latte (M4 Classic)": "泰式传统经典奶茶 (M4推荐)",
      "Hokkaido Cheese Butter Toast": "北海道芝士黄油吐司",
      "Basque Burnt Cheesecake": "巴斯克焦香芝士蛋糕",
    };
    if (cnMap[item.name]) return cnMap[item.name];
    return item.nameEn || item.name;
  }
  return item.name;
}

export function getLocalizedBuildingName(
  buildingNameOrId: string,
  lang: Language = "th"
): string {
  if (!buildingNameOrId) return lang === "en" ? "Bldg M4" : lang === "cn" ? "M4 栋" : "ตึก M4";
  if (lang === "th") return buildingNameOrId;

  const mapEn: Record<string, string> = {
    "loc-m4": "Bldg M4",
    "ตึก M4": "Bldg M4",
    "M4": "Bldg M4",
    "loc-mse": "Bldg MSE",
    "ตึก MSE": "Bldg MSE",
    "MSE": "Bldg MSE",
    "loc-ese": "Bldg ESE",
    "ตึก ESE": "Bldg ESE",
    "ESE": "Bldg ESE",
    "loc-ist": "Bldg IST",
    "ตึก IST": "Bldg IST",
    "IST": "Bldg IST",
    "loc-bse": "Bldg BSE",
    "ตึก BSE": "Bldg BSE",
    "BSE": "Bldg BSE",
    "loc-dorm": "Student Dorm",
    "หอพักนักศึกษา": "Student Dorm",
    "Dorm": "Student Dorm",
    "loc-hub": "Hub Building",
    "ตึก Hub / สำนักอธิการฯ": "Hub Building",
    "Hub": "Hub Building",
  };

  const mapCn: Record<string, string> = {
    "loc-m4": "M4 栋",
    "ตึก M4": "M4 栋",
    "M4": "M4 栋",
    "loc-mse": "MSE 栋",
    "ตึก MSE": "MSE 栋",
    "MSE": "MSE 栋",
    "loc-ese": "ESE 栋",
    "ตึก ESE": "ESE 栋",
    "ESE": "ESE 栋",
    "loc-ist": "IST 栋",
    "ตึก IST": "IST 栋",
    "IST": "IST 栋",
    "loc-bse": "BSE 栋",
    "ตึก BSE": "BSE 栋",
    "BSE": "BSE 栋",
    "loc-dorm": "学生宿舍",
    "หอพักนักศึกษา": "学生宿舍",
    "Dorm": "学生宿舍",
    "loc-hub": "Hub 行政楼",
    "ตึก Hub / สำนักอธิการฯ": "Hub 行政楼",
    "Hub": "Hub 行政楼",
  };

  if (lang === "cn") {
    return mapCn[buildingNameOrId] || buildingNameOrId.replace("ตึก ", "") + " 栋";
  }
  return mapEn[buildingNameOrId] || "Bldg " + buildingNameOrId.replace("ตึก ", "");
}

