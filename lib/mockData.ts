export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyTier: 'VIP' | 'Platinum' | 'Gold' | 'Silver' | 'Standard';
  tags: string[];
  location: string;
  avatarUrl?: string;
  totalSpend: number;
}

export interface Room {
  id: string;
  roomNumber: string;
  roomType: 'Deluxe' | 'Executive Suite' | 'Standard Double' | 'Presidential Suite';
  status: 'Occupied' | 'Vacant' | 'Dirty' | 'Maintenance';
  housekeepingStatus?: 'Clean' | 'Dirty' | 'Inspecting' | 'Out of Order';
}

export interface Reservation {
  id: string;
  guestId: string;
  roomId: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  totalPaid: number;
  bookingSource: 'Direct' | 'Booking.com' | 'Expedia' | 'Walk-in';
  status: 'Checked-in' | 'Pending' | 'Checked-out' | 'Cancelled';
}

export interface Preference {
  id: string;
  guestId: string;
  category: 'Room' | 'Food & Beverage' | 'Bedding' | 'Service' | 'Temperature';
  details: string;
}

export interface InteractionLog {
  id: string;
  guestId: string;
  type: 'Pre-Arrival' | 'During-Stay' | 'Post-Stay' | 'Campaign' | 'Manual';
  channel: 'WhatsApp' | 'Email' | 'SMS';
  dateSent: string; // YYYY-MM-DD HH:mm
  content: string;
  status: 'Sent' | 'Failed' | 'Delivered';
}

export interface Task {
  id: string;
  roomId?: string;
  guestId?: string;
  title: string;
  assignedTo: string;
  urgency: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
  createdAt: string;
}

export interface Enquiry {
  id: string;
  companyName?: string;
  contactName: string;
  email: string;
  phone: string;
  type: 'Corporate Group' | 'Wedding' | 'Event Space' | 'Long Stay';
  estimatedRevenue: number;
  stage: 'Enquiry Received' | 'Proposal Sent' | 'Contract Negotiating' | 'Confirmed / Paid';
  notes: string;
  createdAt: string;
}

// Preloaded mock database
export const initialRooms: Room[] = [
  { id: 'r101', roomNumber: '101', roomType: 'Standard Double', status: 'Occupied', housekeepingStatus: 'Clean' },
  { id: 'r102', roomNumber: '102', roomType: 'Standard Double', status: 'Vacant', housekeepingStatus: 'Clean' },
  { id: 'r104', roomNumber: '104', roomType: 'Deluxe', status: 'Occupied', housekeepingStatus: 'Clean' },
  { id: 'r201', roomNumber: '201', roomType: 'Deluxe', status: 'Vacant', housekeepingStatus: 'Dirty' },
  { id: 'r211', roomNumber: '211', roomType: 'Standard Double', status: 'Occupied', housekeepingStatus: 'Clean' },
  { id: 'r302', roomNumber: '302', roomType: 'Executive Suite', status: 'Occupied', housekeepingStatus: 'Clean' },
  { id: 'r401', roomNumber: '401', roomType: 'Executive Suite', status: 'Maintenance', housekeepingStatus: 'Out of Order' },
  { id: 'r402', roomNumber: '402', roomType: 'Presidential Suite', status: 'Occupied', housekeepingStatus: 'Clean' },
];

export const initialGuests: Guest[] = [
  {
    id: 'g1',
    firstName: 'Tunde',
    lastName: 'Alao',
    email: 'tunde@email.com',
    phone: '+234 803 123 4567',
    loyaltyTier: 'VIP',
    tags: ['Corporate', 'VIP'],
    location: 'Abuja',
    avatarUrl: 'https://picsum.photos/seed/tunde/150',
    totalSpend: 1850000,
  },
  {
    id: 'g2',
    firstName: 'Amara',
    lastName: 'Okafor',
    email: 'amara@email.com',
    phone: '+234 812 345 6789',
    loyaltyTier: 'Gold',
    tags: ['Frequent Flyer'],
    location: 'Lagos',
    avatarUrl: 'https://picsum.photos/seed/amara/150',
    totalSpend: 950000,
  },
  {
    id: 'g3',
    firstName: 'Chioma',
    lastName: 'Ade',
    email: 'chioma@email.com',
    phone: '+234 705 987 6543',
    loyaltyTier: 'Silver',
    tags: ['Short-Let'],
    location: 'Port Harcourt',
    avatarUrl: 'https://picsum.photos/seed/chioma/150',
    totalSpend: 320000,
  },
  {
    id: 'g4',
    firstName: 'David',
    lastName: 'Cole',
    email: 'david.cole@email.com',
    phone: '+44 7700 900077',
    loyaltyTier: 'Platinum',
    tags: ['VIP', 'Corporate'],
    location: 'London',
    avatarUrl: 'https://picsum.photos/seed/david/150',
    totalSpend: 4200000,
  },
  {
    id: 'g5',
    firstName: 'Fatima',
    lastName: 'Yusuf',
    email: 'fatima.y@email.com',
    phone: '+234 809 111 2222',
    loyaltyTier: 'Standard',
    tags: ['Leisure', 'Troublesome'],
    location: 'Kano',
    avatarUrl: 'https://picsum.photos/seed/fatima/150',
    totalSpend: 150000,
  }
];

export const initialReservations: Reservation[] = [
  {
    id: 'res1',
    guestId: 'g1',
    roomId: 'r104',
    checkInDate: '2026-07-02',
    checkOutDate: '2026-07-08',
    totalPaid: 450000,
    bookingSource: 'Direct',
    status: 'Checked-in',
  },
  {
    id: 'res2',
    guestId: 'g2',
    roomId: 'r302',
    checkInDate: '2026-07-04',
    checkOutDate: '2026-07-10',
    totalPaid: 600000,
    bookingSource: 'Booking.com',
    status: 'Checked-in',
  },
  {
    id: 'res3',
    guestId: 'g3',
    roomId: 'r211',
    checkInDate: '2026-07-04',
    checkOutDate: '2026-07-06',
    totalPaid: 160000,
    bookingSource: 'Expedia',
    status: 'Checked-in',
  },
  {
    id: 'res4',
    guestId: 'g4',
    roomId: 'r402',
    checkInDate: '2026-07-01',
    checkOutDate: '2026-07-12',
    totalPaid: 1800000,
    bookingSource: 'Direct',
    status: 'Checked-in',
  },
  {
    id: 'res5',
    guestId: 'g5',
    roomId: 'r102',
    checkInDate: '2026-07-15',
    checkOutDate: '2026-07-18',
    totalPaid: 150000,
    bookingSource: 'Walk-in',
    status: 'Pending',
  }
];

export const initialPreferences: Preference[] = [
  { id: 'p1', guestId: 'g1', category: 'Room', details: 'Loves high floors, away from elevator.' },
  { id: 'p2', guestId: 'g1', category: 'Food & Beverage', details: 'Decaf coffee, prefers white wine.' },
  { id: 'p3', guestId: 'g1', category: 'Bedding', details: 'Feather pillows, extra duvet.' },
  { id: 'p4', guestId: 'g1', category: 'Temperature', details: 'Comfortable at 21°C.' },
  
  { id: 'p5', guestId: 'g2', category: 'Room', details: 'Near emergency exit or stairs.' },
  { id: 'p6', guestId: 'g2', category: 'Food & Beverage', details: 'Strict vegan, almond milk only.' },
  { id: 'p7', guestId: 'g2', category: 'Bedding', details: 'Memory foam pillow.' },
  { id: 'p8', guestId: 'g2', category: 'Temperature', details: 'Prefers warmer room, 23°C.' },

  { id: 'p9', guestId: 'g3', category: 'Room', details: 'Quiet room with garden view.' },
  { id: 'p10', guestId: 'g3', category: 'Food & Beverage', details: 'Gluten-free snacks.' },

  { id: 'p11', guestId: 'g4', category: 'Room', details: 'Corner suite with city view.' },
  { id: 'p12', guestId: 'g4', category: 'Food & Beverage', details: 'Espresso lover, prefers sparkling water.' },
  { id: 'p13', guestId: 'g4', category: 'Bedding', details: 'Goose down duvet and extra firm pillows.' },
  { id: 'p14', guestId: 'g4', category: 'Temperature', details: 'AC set to 19°C.' },

  { id: 'p15', guestId: 'g5', category: 'Service', details: 'Sensitive to noise, requests late check-out.' }
];

export const initialInteractionLogs: InteractionLog[] = [
  {
    id: 'i1',
    guestId: 'g1',
    type: 'Pre-Arrival',
    channel: 'WhatsApp',
    dateSent: '2026-07-01 10:00',
    content: 'Welcome back, Tunde! We’ve noted your preference for high floors away from the elevator. See you on 2026-07-02!',
    status: 'Delivered',
  },
  {
    id: 'i2',
    guestId: 'g1',
    type: 'During-Stay',
    channel: 'SMS',
    dateSent: '2026-07-02 16:00',
    content: 'Hello Tunde, welcome to InnSphere Abuja! We hope your room 104 is up to standard. Reply to this message if you need anything.',
    status: 'Delivered',
  },
  {
    id: 'i3',
    guestId: 'g2',
    type: 'Pre-Arrival',
    channel: 'Email',
    dateSent: '2026-07-03 14:20',
    content: 'Dear Amara, we are preparing Room 302 for your arrival tomorrow. We have pre-arranged your memory foam pillows and notified our chef about your strict vegan diet.',
    status: 'Sent',
  },
  {
    id: 'i4',
    guestId: 'g3',
    type: 'Pre-Arrival',
    channel: 'WhatsApp',
    dateSent: '2026-07-03 09:15',
    content: 'Hello Chioma, check-in instructions for your stay starting tomorrow are enclosed. Your room 211 is ready!',
    status: 'Delivered',
  }
];

export const initialTasks: Task[] = [
  {
    id: 't1',
    roomId: 'r402',
    guestId: 'g4',
    title: 'Provide complimentary wine and sparkling water to Room 402 for anniversary',
    assignedTo: 'Musa (Housekeeping)',
    urgency: 'High',
    status: 'Pending',
    createdAt: '2026-07-04 09:00',
  },
  {
    id: 't2',
    roomId: 'r302',
    guestId: 'g2',
    title: 'Double check almond milk availability in kitchen for Room 302 breakfast',
    assignedTo: 'Chef Ade',
    urgency: 'Medium',
    status: 'Completed',
    createdAt: '2026-07-04 08:30',
  },
  {
    id: 't3',
    roomId: 'r104',
    guestId: 'g1',
    title: 'Deliver extra decaf coffee pods to Room 104',
    assignedTo: 'Grace (Service)',
    urgency: 'Low',
    status: 'Pending',
    createdAt: '2026-07-04 11:15',
  }
];

export const initialEnquiries: Enquiry[] = [
  {
    id: 'e1',
    companyName: 'Chevron Nigeria',
    contactName: 'Engr. Emeka Obi',
    email: 'emeka.obi@chevron.com',
    phone: '+234 802 888 9999',
    type: 'Corporate Group',
    estimatedRevenue: 4500000,
    stage: 'Contract Negotiating',
    notes: 'Requires 15 rooms for 5 nights starting Oct 12. Demanding 20% group discount.',
    createdAt: '2026-06-28',
  },
  {
    id: 'e2',
    contactName: 'Kemi Adebayo',
    email: 'kemi.wedding@gmail.com',
    phone: '+234 817 555 4444',
    type: 'Wedding',
    estimatedRevenue: 2800000,
    stage: 'Proposal Sent',
    notes: 'Wedding reception for 150 guests on Dec 19. Banquet hall catering requested.',
    createdAt: '2026-07-01',
  },
  {
    id: 'e3',
    companyName: 'Techstars Africa',
    contactName: 'Ngozi Okafor',
    email: 'ngozi@techstars.com',
    phone: '+234 803 777 6666',
    type: 'Event Space',
    estimatedRevenue: 1200000,
    stage: 'Enquiry Received',
    notes: '1-day hackathon space needed for 50 people on Aug 15. Requires high-speed fiber internet.',
    createdAt: '2026-07-03',
  },
  {
    id: 'e4',
    companyName: 'Shell Dev',
    contactName: 'Bala Mohammed',
    email: 'b.mohammed@shell.com',
    phone: '+234 901 222 3333',
    type: 'Long Stay',
    estimatedRevenue: 8500000,
    stage: 'Confirmed / Paid',
    notes: 'Consultant stay for 3 months in Executive Suite starting July 10.',
    createdAt: '2026-06-20',
  }
];
