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
    name: "V Building",
    shortCode: "V",
    description: "V Building Main Entrance",
    deskDetail: "1st Floor Central Lobby - One-Order Drop-off Table beside Security Guard",
    photoUrl: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=600&q=80",
    color: "bg-blue-600",
  },
  {
    id: "loc-m1",
    name: "M1 Building",
    shortCode: "M1",
    description: "M1 Building Lobby",
    deskDetail: "Ground Floor Entrance - Designated Delivery Shelf near Elevator A",
    photoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    color: "bg-emerald-600",
  },
  {
    id: "loc-m2",
    name: "M2 Building",
    shortCode: "M2",
    description: "M2 Building Lobby",
    deskDetail: "1st Floor Main Foyer - Long White Table marked 'One-Order Drop-off'",
    photoUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
    color: "bg-amber-600",
  },
  {
    id: "loc-m3",
    name: "M3 Building",
    shortCode: "M3",
    description: "M3 Building Lobby",
    deskDetail: "Ground Floor Glass Entrance - Delivery Desk right next to student lounge",
    photoUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
    color: "bg-purple-600",
  },
  {
    id: "loc-m4",
    name: "M4 Building",
    shortCode: "M4",
    description: "M4 Building Lobby",
    deskDetail: "Lobby Front Desk - Left side counter labeled 'Food Delivery Drop'",
    photoUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80",
    color: "bg-rose-600",
  },
  {
    id: "loc-canteen",
    name: "Canteen",
    shortCode: "Canteen",
    description: "Central Campus Canteen",
    deskDetail: "Canteen North Entrance - Shared Delivery Table by Stall #1",
    photoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
    color: "bg-orange-600",
  },
  {
    id: "loc-k",
    name: "K Building",
    shortCode: "K",
    description: "K Building Front Lobby",
    deskDetail: "Front Entrance Counter - Marked 'One-Order Delivery Zone'",
    photoUrl: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=600&q=80",
    color: "bg-indigo-600",
  },
];

export function getLocationById(id: string): DeliveryLocation | undefined {
  return CAMPUS_LOCATIONS.find((loc) => loc.id === id);
}
