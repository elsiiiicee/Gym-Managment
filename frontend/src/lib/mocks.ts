// Static demo data for things the backend doesn't (and probably won't)
// expose: activity feed, dashboard charts, plan distribution, heatmap,
// member-app screens. Removed everything that now has a real endpoint.

// ---------------------------------------------------------------- activity

export interface ActivityItem {
  id: string;
  who: string;
  what: string;
  when: string;
  type: "booking" | "signup" | "payment" | "cancel";
}

export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", who: "Priya Sharma", what: "booked Sunrise HIIT", when: "2 min ago", type: "booking" },
  { id: "a2", who: "Theo Morris", what: "signed up for Member plan", when: "14 min ago", type: "signup" },
  { id: "a3", who: "Fatima Khan", what: "paid $89.00 · Monthly Member", when: "32 min ago", type: "payment" },
  { id: "a4", who: "Leo Tanaka", what: "cancelled booking · Pilates Core", when: "1 hr ago", type: "cancel" },
  { id: "a5", who: "Amara Okafor", what: "booked Spin & Sweat", when: "2 hr ago", type: "booking" },
  { id: "a6", who: "Wei Zhang", what: "upgraded to Elite plan", when: "3 hr ago", type: "payment" },
  { id: "a7", who: "Noor Ahmed", what: "created an account", when: "5 hr ago", type: "signup" },
];

// ---------------------------------------------------------------- charts

export const REVENUE_SERIES = [
  { m: "Jun", v: 42 },
  { m: "Jul", v: 48 },
  { m: "Aug", v: 51 },
  { m: "Sep", v: 47 },
  { m: "Oct", v: 55 },
  { m: "Nov", v: 58 },
  { m: "Dec", v: 49 },
  { m: "Jan", v: 62 },
  { m: "Feb", v: 68 },
  { m: "Mar", v: 74 },
  { m: "Apr", v: 79 },
  { m: "May", v: 86 },
];

export const BOOKINGS_SERIES = [
  { d: "Mon", v: 142 },
  { d: "Tue", v: 168 },
  { d: "Wed", v: 154 },
  { d: "Thu", v: 189 },
  { d: "Fri", v: 176 },
  { d: "Sat", v: 215 },
  { d: "Sun", v: 98 },
];

export const PLAN_DISTRIBUTION = [
  { label: "Member", value: 1284, color: "hsl(244 75% 60%)" },
  { label: "Elite", value: 412, color: "hsl(280 65% 60%)" },
  { label: "Drop-in", value: 236, color: "hsl(173 60% 45%)" },
];

export const ATTENDANCE_HEATMAP = {
  rows: ["Morning", "Midday", "Afternoon", "Evening", "Late"],
  cols: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  data: [
    [82, 91, 88, 95, 86, 110, 42],
    [34, 41, 38, 44, 39, 62, 31],
    [56, 64, 51, 68, 59, 92, 38],
    [108, 124, 116, 132, 119, 88, 64],
    [22, 28, 19, 31, 26, 36, 14],
  ],
};

// ---------------------------------------------------------------- member-app
// The member-app preview page is a pure visual mockup — keep its data here.

export const MEMBER_ME = {
  id: "usr_9b73",
  fullName: "Priya Sharma",
  email: "priya.s@example.com",
  plan: "Member",
  joined: "2024-11-04",
  creditBalance: 42.5,
  visitsThisMonth: 14,
  nextRenewal: "Jun 4, 2026",
  passCode: "LEG-9B73-A412-PKDQ",
};

export interface MemberBooking {
  id: string;
  name: string;
  trainer: string;
  when: string;
  category: string;
  status: "CONFIRMED" | "PENDING";
}

export const MEMBER_BOOKINGS: MemberBooking[] = [
  { id: "mb1", name: "Sunrise HIIT", trainer: "Jordan Alvarez", when: "Today · 6:30 AM", category: "HIIT", status: "CONFIRMED" },
  { id: "mb2", name: "Vinyasa Flow", trainer: "Maya Chen", when: "Tomorrow · 9:00 AM", category: "Yoga", status: "CONFIRMED" },
  { id: "mb3", name: "Pilates Core", trainer: "Isabella Rossi", when: "Fri · 11:00 AM", category: "Pilates", status: "PENDING" },
];

export interface MemberTxn {
  id: string;
  label: string;
  when: string;
  amount: number;
}

export const MEMBER_TXNS: MemberTxn[] = [
  { id: "t1", label: "Credit added by Maya Chen", when: "May 22", amount: 25.0 },
  { id: "t2", label: "Spin & Sweat · drop-in", when: "May 18", amount: -8.5 },
  { id: "t3", label: "Sports massage", when: "May 10", amount: -45.0 },
  { id: "t4", label: "Monthly membership", when: "May 1", amount: -89.0 },
  { id: "t5", label: "Credit added by Maya Chen", when: "Apr 28", amount: 75.0 },
];

export const MEMBER_CATEGORIES: Array<{ key: string; hueA: number; hueB: number }> = [
  { key: "HIIT", hueA: 244, hueB: 290 },
  { key: "Yoga", hueA: 173, hueB: 200 },
  { key: "Strength", hueA: 24, hueB: 0 },
  { key: "Cardio", hueA: 320, hueB: 350 },
  { key: "Pilates", hueA: 280, hueB: 320 },
  { key: "Recovery", hueA: 200, hueB: 230 },
];

// Sample classes for the Member-app preview (the real Classes admin page
// reads /api/admin/classes). Kept here so the iOS frame demo doesn't depend
// on the backend being seeded.
export interface MemberAppClass {
  id: string;
  name: string;
  trainerName: string;
  schedule: string;
  capacity: number;
  enrolled: number;
  durationMin: number;
  category: string;
}

export const MEMBER_APP_CLASSES: MemberAppClass[] = [
  { id: "cls_01", name: "Sunrise HIIT", trainerName: "Jordan Alvarez", schedule: "Mon · Wed · Fri · 6:30 AM", capacity: 20, enrolled: 18, durationMin: 45, category: "HIIT" },
  { id: "cls_02", name: "Power Lifting Lab", trainerName: "Devon Brooks", schedule: "Tue · Thu · 7:00 PM", capacity: 12, enrolled: 9, durationMin: 60, category: "Strength" },
  { id: "cls_03", name: "Vinyasa Flow", trainerName: "Maya Chen", schedule: "Daily · 9:00 AM", capacity: 24, enrolled: 22, durationMin: 60, category: "Yoga" },
  { id: "cls_04", name: "Spin & Sweat", trainerName: "Sasha Lee", schedule: "Mon · Wed · Sat · 5:30 PM", capacity: 30, enrolled: 27, durationMin: 50, category: "Cardio" },
  { id: "cls_05", name: "Mobility Reset", trainerName: "Maya Chen", schedule: "Sun · 10:00 AM", capacity: 16, enrolled: 7, durationMin: 40, category: "Recovery" },
];
