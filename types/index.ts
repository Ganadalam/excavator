// ═══════════════════════════════════════════════════════════
//  Domain Types
// ═══════════════════════════════════════════════════════════

export interface User {
  id: string;
  username: string;
  name: string;
  passwordHash: string; // bcrypt hash — never exposed to client
  createdAt: string;
  role: "admin" | "user";    // admin: 전체 회원 관리 가능
  isActive: boolean;          // false: 로그인 차단
}

/** Safe user object returned to client (no passwordHash) */
export type SafeUser = Omit<User, "passwordHash">;

export interface Company {
  id: number;
  name: string;
  manager: string;
  contact: string;
  bizNo: string;
  contractStart: string;
  address: string;
  mainContract: string;
  note: string;
}

export interface MaintenanceLog {
  id: number;
  date: string;
  type: string;
  cost: number;
  shop: string;
  note: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: EquipmentType;
  model: string;
  year: number;
  regno: string;
  operator: string;
  rate: number;
  baseFuel: number;

  // Insurance
  insurer: string;
  insExpiry: string;
  insFee: number;

  // Inspection
  inspLast: string;
  inspNext: string;

  // Fixed monthly costs
  lease: number;
  parking: number;
  fixedOther: number;

  // Maintenance
  maintLast: string;
  maintNext: string;
  utilRate: number;
  maintLogs: MaintenanceLog[];

  note: string;
}

export type EquipmentType = "굴삭기" | "로더" | "불도저" | "크레인" | "덤프트럭" | "기타";

export interface Work {
  id: number;
  date: string;
  companyId: number;
  equipmentId: number;
  rate: number;
  otr: number;
  hours: number;
  ohours: number;
  fuel: number;
  extra: number;
  note: string;
}

/** Full user data stored per-user */
export interface UserData {
  companies: Company[];
  equipments: Equipment[];
  works: Work[];
}

// ═══════════════════════════════════════════════════════════
//  API Response Types
// ═══════════════════════════════════════════════════════════

export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}
export interface ApiError {
  ok: false;
  error: string;
}
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ═══════════════════════════════════════════════════════════
//  Auth
// ═══════════════════════════════════════════════════════════

export interface AuthPayload {
  sub: string;    // user id
  name: string;
  role: "admin" | "user";
  iat: number;
  exp: number;
}

// ═══════════════════════════════════════════════════════════
//  Report
// ═══════════════════════════════════════════════════════════

export type ReportPeriodType = "month" | "week" | "year" | "custom";

export interface ReportFilter {
  type: ReportPeriodType;
  year: number;
  month: number;
  from?: string;
  to?: string;
}

export interface ChartBar {
  label: string;
  amount: number;
  isToday: boolean;
}

// ═══════════════════════════════════════════════════════════
//  Admin
// ═══════════════════════════════════════════════════════════

export interface AdminUserView extends SafeUser {
  worksCount: number;
  companiesCount: number;
  equipmentsCount: number;
}
