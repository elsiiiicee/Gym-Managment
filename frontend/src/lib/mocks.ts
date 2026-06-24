// Static demo data for things the backend doesn't (and probably won't)
// expose: activity feed, dashboard charts, plan distribution, heatmap.

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

