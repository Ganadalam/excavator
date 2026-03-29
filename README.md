<div align="center">

# 🚜 EX-MGMT Pro

**중장비 통합 관리 시스템 — Full-Stack SaaS 포트폴리오 프로젝트**

Next.js 15 · Prisma · PostgreSQL · JWT 인증 · 다크/라이트 모드 · Vercel 배포

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## 📌 프로젝트 개요

중장비 사업장의 **작업 등록 · 장비 관리 · 업체 관리 · 매출 보고서 · 관리자 회원 관리**를 하나의 웹 앱으로 통합한 사내 관리 시스템입니다.

실제 현장에서 쓰는 분들(50대 사용자)을 타겟으로 설계했기 때문에 **글자 크기 3단계 조절**, **모바일 바텀 시트 모달**, **iOS 줌 방지** 등 접근성에 집중했습니다.

파일 기반 JSON → Prisma + SQLite → Vercel + Supabase PostgreSQL 순으로 직접 마이그레이션한 경험이 담겨 있습니다.

---

## ✨ 구현 기능

### 핵심 업무 기능

| 기능                 | 설명                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| **작업 등록 · 수정** | 업체/장비 선택, 기본·초과 시간, 실시간 청구금액 계산 미리보기            |
| **일별 · 월별 필터** | 날짜 피커 / 월 피커로 작업 내역 즉시 필터링, 장비·업체별 필터            |
| **장비 관리**        | 등록/수정, 보험·정기검사 만료 D-day 알림, 정비이력, 연월별 비용 아코디언 |
| **업체 관리**        | 등록/수정/삭제, 계약 정보, 누적 매출                                     |
| **보고서**           | 월별/주별/연간/기간 지정, **계산식 포함** PDF 출력 및 CSV 다운로드       |
| **관리자 패널**      | 회원 목록, 활성화/비활성화, 권한 부여, 비밀번호 초기화, 회원 삭제        |

### 시스템 기능

| 기능                   | 설명                                                            |
| ---------------------- | --------------------------------------------------------------- |
| **다크 / 라이트 모드** | CSS Custom Properties 기반, flash 없이 즉시 적용                |
| **글자 크기 3단계**    | 보통(16px) / 크게(19px) / 최대(22px), localStorage 유지         |
| **모바일 최적화**      | 바텀 시트 모달, 44px 터치 타깃, iOS 줌 방지, 하단 탭 바         |
| **비상 데이터 조회**   | DB 장애 시 `/emergency`에서 JSON 백업 읽기 전용 조회            |
| **자동 백업**          | 모든 write 작업 후 `.backup/emergency.json` 스냅샷 생성         |
| **보안**               | httpOnly JWT 쿠키, bcrypt 12 rounds, Timing-safe 비교, CSP/HSTS |

---

## 🔧 기술적 문제 해결 기록

### 1. JSON 파일 스토리지 → Prisma 마이그레이션

**문제:** 초기 구현에서 `.data/` 디렉토리에 사용자별 JSON 파일로 데이터를 저장했습니다. 동시 요청 Race condition, 서버 재배포 시 데이터 유실 위험, 인덱스 부재로 인한 전체 파일 읽기 등 프로덕션 한계가 있었습니다.

**해결:** `lib/db.ts`의 **함수 시그니처를 그대로 유지**하면서 내부만 Prisma로 교체했습니다. API 라우트와 컴포넌트는 코드 수정 없이 DB 교체가 완료됐습니다. `schema.prisma`의 `provider` 한 줄로 SQLite ↔ PostgreSQL 전환이 가능합니다.

```ts
// Before: 동기 fs 기반
export function getWorks(userId: string): Work[] {
  return getUserData(userId).works;
}

// After: Prisma 비동기
export async function getWorks(userId: string): Promise<Work[]> {
  const rows = await prisma.work.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  return rows.map(toWork);
}
```

---

### 2. Vercel 배포 시 SQLite 동작 불가

**문제:** Vercel은 파일시스템이 읽기 전용이라 SQLite DB 파일을 생성·쓰기할 수 없어 회원가입 시 서버 오류가 발생했습니다.

**해결:** Supabase PostgreSQL로 전환했습니다. `schema.prisma`에서 `provider`만 변경하고 `DATABASE_URL`을 Supabase 연결 문자열로 교체했습니다. `lib/db.ts`의 코드는 전혀 건드리지 않았습니다.

```prisma
// prisma/schema.prisma — provider 한 줄만 변경
datasource db {
  provider = "postgresql"   // "sqlite" → "postgresql"
  url      = env("DATABASE_URL")
}
```

---

### 3. Next.js 15 + Prisma 싱글턴 패턴

**문제:** Next.js 개발 서버 Hot Reload 시 모듈이 재실행될 때마다 `new PrismaClient()`가 호출되어 "too many connections" 경고가 발생했습니다.

**해결:** `globalThis`에 PrismaClient 인스턴스를 캐싱. 프로덕션(Vercel 서버리스)에서는 각 함수 인스턴스가 독립적이라 캐싱하지 않습니다.

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

### 4. HTTP 헤더 한글 인코딩 오류

**문제:** Middleware에서 `res.headers.set("x-user-name", payload.name)` 호출 시 한글 이름이 포함되면 `Cannot convert argument to a ByteString (value > 255)` 런타임 오류가 발생했습니다. HTTP 헤더는 ASCII(0~127)만 허용하기 때문입니다.

**해결:** 사용하지 않는 `x-user-name` 헤더를 제거하고 필요한 식별자(`sub`, `role`)만 헤더로 전달했습니다.

---

### 5. 숫자 입력 필드 UX — 0이 입력을 방해하는 문제

**문제:** 숫자 필드 초기값이 `0`으로 설정되어 클릭 후 즉시 타이핑하면 `0` 뒤에 숫자가 붙는 현상(`0150000`)이 발생했습니다. `onChange`에서 `Number(e.target.value)`를 즉시 호출하면 `""` → `0`으로 재변환되어 기존 방식으로는 해결이 불가능했습니다.

**해결:** 두 가지를 병행했습니다.

- `Input` 컴포넌트 `onFocus` 핸들러: `type="number"`이고 값이 `"0"`이면 포커스 시 클리어
- `EquipmentModal` 폼 상태를 `number` → **`string` 타입**으로 변경: raw string을 그대로 저장하고 저장 시점에만 `Number()` 변환

```ts
const handleFocus = useCallback(
  (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === "number" && e.target.value === "0") e.target.value = "";
    onFocus?.(e);
  },
  [type, onFocus],
);
```

---

### 6. Next.js Hydration 불일치 — 테마/폰트 플래시

**문제:** 서버는 항상 `dark` 클래스로 렌더링하는데, 클라이언트 인라인 스크립트가 `localStorage`에서 `light`를 읽어 클래스를 변경하면 서버/클라이언트 DOM이 달라져 React Hydration 에러가 발생했습니다.

**해결:** `<html>` 태그에 `suppressHydrationWarning` 추가. 테마/폰트 클래스처럼 서버와 클라이언트가 의도적으로 다를 수밖에 없는 케이스에서 공식 권장 방법입니다.

```tsx
<html lang="ko" className="dark font-normal" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: `
      try {
        var t = localStorage.getItem('exmgmt_theme') || 'dark';
        var f = localStorage.getItem('exmgmt_font')  || 'normal';
        document.documentElement.classList.add(t, 'font-' + f);
      } catch(e){}
    `}} />
  </head>
```

---

### 7. DB 장애 시 비상 데이터 접근

**문제:** DB 파일 손상이나 연결 실패 시 중요한 매출·작업 데이터에 접근할 방법이 없었습니다.

**해결:** 모든 write API 성공 후 `writeBackup()`으로 전체 스냅샷을 `.backup/emergency.json`에 저장합니다. `/emergency` 페이지는 DB 연결 없이 JWT 쿠키만으로 인증 후 백업 데이터를 조회·다운로드할 수 있습니다. `writeBackup()`은 try-catch로 감싸 백업 실패가 실제 응답에 영향을 주지 않습니다.

---

## 🛠 기술 스택

```
Frontend    Next.js 15 (App Router) · React 19 · TypeScript 5
Styling     Tailwind CSS v3 · CSS Custom Properties (다크/라이트 테마)
State       Zustand
Database    PostgreSQL (Supabase) — 로컬 개발 시 SQLite
ORM         Prisma 5 (트랜잭션, 인덱스, Cascade 삭제)
Auth        jose (JWT HS256) · bcryptjs · httpOnly Cookie
Validation  Zod
Icons       Lucide React
Deployment  Vercel + Supabase
```

---

## 🚀 시작하기

### 로컬 개발 (SQLite)

```bash
git clone https://github.com/your-username/exmgmt-pro.git
cd exmgmt-pro
npm install
```

`.env.local` 생성:

```env
DATABASE_URL="file:./prisma/exmgmt.db"
JWT_SECRET=32자이상랜덤문자열을여기에입력하세요1234567890abcdef
```

> Prisma CLI는 `.env.local`을 읽지 못합니다. `.env`도 별도로 생성해주세요.

```bash
cp .env.local .env      # Prisma CLI용
npm run db:push         # 테이블 생성
npm run dev             # → http://localhost:3000
```

> 최초 회원가입 계정이 자동으로 **admin** 권한을 갖습니다.

---

### Vercel + Supabase 배포

#### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → **New project**
2. 지역: `Northeast Asia (Seoul)` 권장
3. 프로젝트 생성 후 **Project Settings → Database → Connection string → Transaction** 탭에서 URL 복사 (포트 `6543`)

#### 2. 로컬에서 테이블 생성 (1회)

`.env.local`의 `DATABASE_URL`을 Supabase URL로 교체 후:

```bash
cp .env.local .env
npm run db:push
```

#### 3. Vercel 환경변수 설정

Vercel 대시보드 → **Settings → Environment Variables**:

| Key            | Value                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PW]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres` |
| `JWT_SECRET`   | 32자 이상 랜덤 문자열                                                                     |

#### 4. 배포 및 확인

```bash
git push  # Vercel 자동 배포
```

배포 완료 후 `/api/health` 접속 → `{"ok": true, "db": "connected"}` 확인

---

### 유용한 스크립트

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run db:push      # 스키마 → DB 적용 (개발)
npm run db:migrate   # 마이그레이션 파일 생성 (프로덕션 권장)
npm run db:studio    # Prisma Studio GUI → http://localhost:5555
npm run db:seed      # 기본 admin 계정 생성 (admin / admin1234)
```

---

## 📁 프로젝트 구조

```
exmgmt/
├── prisma/
│   ├── schema.prisma        # DB 스키마 (SQLite ↔ PostgreSQL 전환 가능)
│   ├── seed.ts              # 초기 admin 계정 생성
│   └── exmgmt.db            # SQLite 파일 (런타임 생성, .gitignore)
│
├── app/
│   ├── (auth)/              # 로그인 · 회원가입
│   ├── api/
│   │   ├── auth/            # 로그인 · 로그아웃 · 세션 · 회원가입
│   │   ├── admin/users/     # 관리자 회원 관리 (PATCH · DELETE)
│   │   ├── works/           # 작업 CRUD
│   │   ├── equipments/      # 장비 CRUD
│   │   ├── companies/       # 업체 CRUD
│   │   ├── report/export/   # CSV 내보내기 (계산식 포함)
│   │   ├── emergency/       # 비상 백업 조회 (DB 없이 JWT만으로 인증)
│   │   └── health/          # DB 연결 상태 확인
│   └── dashboard/
│       ├── work | equipment | company | report | admin
│       └── emergency/       # 읽기 전용 비상 데이터 뷰어
│
├── components/
│   ├── admin/AdminPanel.tsx # 회원 관리, 비상 접근 배너
│   ├── equipment/           # EquipmentList · EquipmentModal
│   ├── report/ReportPanel   # 계산식 포함 PDF/CSV
│   ├── ui/                  # Button · Input · Modal · Select · Toast …
│   └── work/                # WorkForm · WorkList
│
├── lib/
│   ├── auth.ts              # JWT · bcrypt · httpOnly 쿠키
│   ├── backup.ts            # 자동 JSON 스냅샷
│   ├── db.ts                # Prisma 데이터 액세스 레이어
│   ├── prisma.ts            # PrismaClient 싱글턴
│   ├── store.ts             # Zustand (user · theme · fontSize · CRUD)
│   └── theme.ts             # 다크/라이트 · 글자 크기 유틸
│
└── middleware.ts            # JWT 검증 · admin 라우트 보호
```

---

## 🔒 보안 설계

| 항목               | 구현                                                          |
| ------------------ | ------------------------------------------------------------- |
| 인증 토큰          | `httpOnly` + `Secure` + `SameSite=Lax` — JS에서 접근 불가     |
| 비밀번호           | bcrypt 12 rounds — 평문 저장 없음                             |
| Timing attack      | 미존재 계정도 동일 bcrypt 비교 후 동일 오류 반환              |
| JWT 시크릿         | 환경변수 필수, 32자 미만 시 프로덕션 기동 불가                |
| 관리자 보호        | Middleware + API 이중 역할 검증                               |
| 계정 비활성화      | `isActive=false` 시 로그인·세션 갱신 모두 차단                |
| 마지막 어드민 보호 | 마지막 관리자의 역할 변경·삭제 차단                           |
| HTTP 보안 헤더     | `X-Frame-Options` · `CSP` · `HSTS` · `X-Content-Type-Options` |
| 헤더 인코딩        | 한글 이름을 HTTP 헤더에 전달하지 않음                         |
| 데이터 격리        | 모든 쿼리에 `userId` 조건 — 사용자 간 데이터 완전 격리        |

---

## 🗺 Roadmap

- [ ] 인보이스(청구서) PDF 자동 생성 — 업체별 월별
- [ ] 보험·정기검사 만료 이메일 알림 (D-30)
- [ ] PWA — 현장에서 모바일로 작업 등록 (오프라인 지원)
- [ ] 다중 사업장 멀티테넌트 지원
- [ ] OAuth 소셜 로그인

---

## 📄 라이선스

MIT

---

<div align="center">
  <sub>Built with Next.js + Prisma + Supabase · Deployed on Vercel 🚜</sub>
</div>
