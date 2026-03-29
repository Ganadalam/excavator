import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "아이디는 3자 이상이어야 합니다")
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "아이디는 영문·숫자·밑줄만 가능합니다"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다").max(100),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(1, "이름을 입력하세요").max(30),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

// ── Work ──────────────────────────────────────────────────

export const workSchema = z.object({
  id: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  companyId: z.number().positive("업체를 선택하세요"),
  equipmentId: z.number().positive("장비를 선택하세요"),
  rate: z.number().min(0),
  otr: z.number().min(0),
  hours: z.number().min(0),
  ohours: z.number().min(0),
  fuel: z.number().min(0),
  extra: z.number().min(0),
  note: z.string().max(200).default(""),
});

// ── Company ───────────────────────────────────────────────

export const companySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "업체명을 입력하세요").max(50),
  manager: z.string().max(30).default(""),
  contact: z.string().max(20).default(""),
  bizNo: z.string().max(20).default(""),
  contractStart: z.string().default(""),
  address: z.string().max(100).default(""),
  mainContract: z.string().max(100).default(""),
  note: z.string().max(500).default(""),
});

// ── Maintenance Log ───────────────────────────────────────

export const maintLogSchema = z.object({
  id: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().max(30),
  cost: z.number().min(0),
  shop: z.string().max(50).default(""),
  note: z.string().max(200).default(""),
});

// ── Equipment ─────────────────────────────────────────────

export const equipmentSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "장비명을 입력하세요").max(50),
  type: z.enum(["굴삭기", "로더", "불도저", "크레인", "덤프트럭", "기타"]),
  model: z.string().max(50).default(""),
  year: z.number().min(1990).max(2040),
  regno: z.string().max(20).default(""),
  operator: z.string().max(30).default(""),
  rate: z.number().min(0),
  baseFuel: z.number().min(0),
  insurer: z.string().max(30).default(""),
  insExpiry: z.string().default(""),
  insFee: z.number().min(0).default(0),
  inspLast: z.string().default(""),
  inspNext: z.string().default(""),
  lease: z.number().min(0).default(0),
  parking: z.number().min(0).default(0),
  fixedOther: z.number().min(0).default(0),
  maintLast: z.string().default(""),
  maintNext: z.string().default(""),
  utilRate: z.number().min(0).max(100).default(0),
  maintLogs: z.array(maintLogSchema).default([]),
  note: z.string().max(500).default(""),
});
