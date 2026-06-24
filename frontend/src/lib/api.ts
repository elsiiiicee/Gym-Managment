// Typed fetch wrapper around the Legion backend.
// JWT is read from localStorage on every call.
// All paths are relative ("/api/..."); next.config.ts rewrites them to the backend.

const TOKEN_KEY = "legion.accessToken";
const REFRESH_KEY = "legion.refreshToken";
const ROLE_KEY = "legion.role";
const EMAIL_KEY = "legion.email";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function getEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMAIL_KEY);
}

export function setAuth(tokens: {
  accessToken: string;
  refreshToken: string;
  role: string;
  email?: string;
}) {
  window.localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  window.localStorage.setItem(ROLE_KEY, tokens.role);
  if (tokens.email) window.localStorage.setItem(EMAIL_KEY, tokens.email);
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // Auto-set JSON content type for typed bodies, but NEVER for FormData —
  // the browser must set its own multipart boundary header.
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    // If our own token expired mid-session, bounce to /login. Skip this for
    // auth endpoints themselves so a bad login password just surfaces a
    // 401 error to the form.
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("/api/auth/")
    ) {
      clearAuth();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    const message =
      (body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : null) ?? res.statusText ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, body, message);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  // multipart/form-data: pass the raw FormData. The browser sets the
  // Content-Type header (with boundary) automatically.
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ---------- Auth ----------

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  role: "USER" | "TRAINER" | "ADMIN";
}

// ---------- Admin: Members ----------
// Matches AdminController.UserAdminResponse

export type UserRole = "ADMIN" | "TRAINER" | "USER";

export interface MemberRow {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  joined: string; // ISO instant
}

export interface CreateMemberRequest {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  active: boolean;
  welcomeCreditCents?: number;
}

// ---------- Admin: Classes ----------
// Matches AdminClassController.ClassAdminResponse

export interface AdminGymClass {
  id: string;
  title: string;
  description: string;
  trainerName: string;
  trainerId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  enrolled: number;
  durationMin: number;
  category: string;
  /** Drop-in price in cents. 0 = free. Members with an active subscription book free. */
  priceCents: number;
  active: boolean;
}

export interface ClassCreateRequest {
  trainerId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  category?: string;
  priceCents?: number;
}

export interface ClassUpdateRequest extends ClassCreateRequest {
  active: boolean;
}

// ---------- Admin: Trainers ----------
// Matches AdminTrainerController.TrainerAdminResponse

export interface AdminTrainer {
  id: string;
  name: string;
  email: string | null;
  specialty: string;
  bio: string;
  rating: number | null;
  classesPerWeek: number;
  /** What the gym pays this trainer per class taught (cents). */
  feePerClassCents: number;
  active: boolean;
}

export interface TrainerCreateRequest {
  userId?: string | null;
  name: string;
  specialty: string;
  bio: string;
  rating?: number | null;
  feePerClassCents?: number | null;
}

export interface TrainerUpdateRequest {
  name: string;
  specialty: string;
  bio: string;
  active: boolean;
  rating?: number | null;
  feePerClassCents?: number | null;
}

// ---------- Admin: Payroll ----------

export interface PayrollRow {
  trainerId: string;
  name: string;
  specialty: string;
  feePerClassCents: number;
  classesTaught: number;
  earnedCents: number;
  paidCents: number;
  outstandingCents: number;
  active: boolean;
}

export interface PayoutRequest {
  amountCents: number;
  notes?: string;
  idempotencyKey: string;
}

export interface PayoutResult {
  payoutId: string;
  trainerId: string;
  amountCents: number;
  notes: string | null;
  createdAt: string;
}

// ---------- Admin: Memberships ----------
// Matches AdminMembershipController.PlanAdminResponse

export interface AdminMembershipPlan {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  billingPeriodMonths: number;
  active: boolean;
  popular: boolean;
  features: string[];
}

// ---------- Admin: Bookings ----------
// Matches AdminBookingController.BookingAdminResponse

export interface AdminBooking {
  id: string;
  memberName: string;
  memberEmail: string;
  className: string;
  trainerName: string;
  startsAt: string;
  endsAt: string;
  status: "BOOKED" | "CANCELED";
  canceledAt: string | null;
}

// ---------- Admin: Wallets ----------
// Matches AdminWalletController.{WalletSummary,RecentTxn}

export interface WalletSummary {
  userId: string;
  memberName: string;
  memberEmail: string;
  balanceCents: number;
  updatedAt: string;
}

export interface RecentTxn {
  transactionId: string;
  userId: string;
  memberName: string;
  amountCents: number;
  transactionType:
    | "CREDIT_ADD"
    | "PURCHASE"
    | "REFUND"
    | "MEMBERSHIP_PAYMENT"
    | "ADMIN_ADJUSTMENT";
  notes: string | null;
  createdAt: string;
}

export interface CreditRequest {
  amountCents: number;
  type?: RecentTxn["transactionType"];
  notes?: string;
  idempotencyKey: string;
}

// ---------- Member (self) ----------
// Matches WalletController, MembershipController, ClassController response shapes.

export interface MyProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  phone: string | null;
  avatarPath: string | null;
  /** Public URL the SPA can use as `<img src=...>`, or null if no avatar yet. */
  avatarUrl: string | null;
}

export interface MyWallet {
  walletId: string;
  userId: string;
  balanceCents: number;
  updatedAt: string;
}

export interface MyWalletTxn {
  id: string;
  amountCents: number;
  balanceAfterCents: number;
  transactionType:
    | "CREDIT_ADD"
    | "PURCHASE"
    | "REFUND"
    | "MEMBERSHIP_PAYMENT"
    | "ADMIN_ADJUSTMENT";
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  billingPeriodMonths: number;
  popular: boolean;
  features: string[];
}

export interface MySubscription {
  id: string;
  planId: string;
  planName: string;
  status: "ACTIVE" | "CANCELED" | "EXPIRED";
  startsAt: string;
  endsAt: string;
}

export interface PurchaseSubscriptionRequest {
  planId: string;
  idempotencyKey: string;
}

export interface MemberClass {
  id: string;
  title: string;
  trainerName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  /** Drop-in price in cents. 0 = free for everyone. Active subscription = free regardless. */
  priceCents: number;
}

export interface MemberBooking {
  id: string;
  classId: string;
  title: string;
  status: "BOOKED" | "CANCELED";
  startsAt: string;
  endsAt: string;
}

export interface BookRequest {
  classId: string;
}

// ---------- Admin: Analytics ----------
// Matches AdminController.AnalyticsResponse

export interface Analytics {
  users: number;
  products: number;
  orders: number;
  revenueCents: number;
  subscriptions: number;
  classes: number;
  bookings: number;
}
