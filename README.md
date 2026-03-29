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

중장비 사업장의 **작업 등록 · 장비 관리 · 업체 관리 · 매출 보고서 · 관리자 회원 관리**를 통합한 사내 관리 시스템입니다.

실제 현장 사용자(50대)를 타겟으로 글자 크기 조절, 모바일 바텀 시트, iOS 줌 방지 등 접근성에 집중했으며, 파일 기반 JSON → Prisma + SQLite → Vercel + Supabase PostgreSQL 순으로 직접 마이그레이션한 경험이 담겨 있습니다.

## 배포 링크 : https://for-dad-seven.vercel.app/login

---

## ✨ 구현 기능

| 기능                   | 설명                                                          |
| ---------------------- | ------------------------------------------------------------- |
| **작업 등록 · 수정**   | 업체/장비 선택, 기본·초과 시간, 실시간 청구금액 계산 미리보기 |
| **일별 · 월별 필터**   | 날짜 피커 / 월 피커, 장비·업체별 필터링                       |
| **장비 관리**          | 보험·검사 만료 D-day 알림, 정비이력, 연월별 비용 아코디언     |
| **보고서**             | 월별/연간/기간 지정, 계산식 포함 PDF · CSV 다운로드           |
| **관리자 패널**        | 회원 활성화·비활성화, 권한 부여, 비밀번호 초기화              |
| **글자 크기 3단계**    | 보통/크게/최대, localStorage 유지                             |
| **다크 / 라이트 모드** | CSS Custom Properties 기반, flash 없이 즉시 적용              |
| **비상 데이터 조회**   | DB 장애 시 `/emergency`에서 JSON 백업 읽기 전용 조회          |

---

## 🔧 기술적 의사결정 및 문제 해결

### 1. 데이터 레이어 설계 — 파일 JSON vs SQLite vs PostgreSQL

처음에는 외부 의존성 없이 빠르게 시작하기 위해 `.data/` 디렉토리에 사용자별 JSON 파일로 저장했습니다. 단일 Node.js 인스턴스 내에서는 Race condition이 없고, 별도 DB 설치 없이 로컬 실행이 가능하다는 장점이 있었습니다.

하지만 프로덕션 환경을 고려하면서 세 가지 문제가 명확해졌습니다.

- **동시성:** Node.js 싱글 스레드 특성상 단일 인스턴스에서는 안전하지만, PM2 클러스터나 Vercel 서버리스처럼 다중 인스턴스 환경에서는 같은 파일을 동시에 덮어쓰는 Race condition이 생깁니다.
- **성능:** 작업 1건을 추가할 때도 사용자 전체 데이터 파일을 읽고 쓰기 때문에, 데이터가 쌓일수록 I/O 비용이 선형으로 증가합니다.
- **배포 환경 제약:** Vercel은 파일시스템이 읽기 전용입니다. SQLite도 같은 이유로 동작하지 않습니다.

**대안 검토:**

| 옵션                  | 장점                       | 단점                            | 결정           |
| --------------------- | -------------------------- | ------------------------------- | -------------- |
| JSON 파일 유지        | 설치 불필요                | 다중 인스턴스 불가, Vercel 불가 | ❌             |
| SQLite + Prisma       | 설치 불필요, SQL 안정성    | Vercel 파일시스템 제약          | 로컬 개발용 ✅ |
| PostgreSQL (Supabase) | 프로덕션 표준, Vercel 호환 | 외부 서비스 의존                | 배포용 ✅      |
| PlanetScale / Neon    | PostgreSQL 호환 서버리스   | 무료 티어 제한                  | 검토 후 제외   |

**핵심 설계 결정:** `lib/db.ts`의 **함수 시그니처를 그대로 유지**하면서 내부 구현만 Prisma로 교체했습니다. API 라우트와 컴포넌트는 코드 수정 없이 DB 교체가 완료됐고, `schema.prisma`의 `provider` 한 줄로 SQLite ↔ PostgreSQL 전환이 가능한 구조가 됐습니다. 이는 [Adapter 패턴](https://refactoring.guru/design-patterns/adapter)을 응용한 것으로, 스토리지 구현을 비즈니스 로직에서 완전히 분리합니다.

```ts
// Before: 동기 fs 기반 (시그니처 동일)
export function getWorks(userId: string): Work[] {
  return getUserData(userId).works;
}

// After: Prisma 비동기 (호출부 코드 변경 없음)
export async function getWorks(userId: string): Promise<Work[]> {
  const rows = await prisma.work.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  return rows.map(toWork);
}
```

---

### 2. 인증 설계 — Cookie vs localStorage JWT

클라이언트에서 인증 토큰을 관리하는 방법으로 `localStorage`와 `httpOnly Cookie` 두 가지를 검토했습니다.

`localStorage`는 구현이 단순하고 SPA에서 접근이 편리하지만, XSS 공격 시 스크립트가 직접 토큰을 읽어 탈취할 수 있습니다. 반면 `httpOnly Cookie`는 JavaScript에서 접근이 불가능해 XSS에 안전하고, 브라우저가 요청마다 자동으로 포함시켜 줍니다.

**`httpOnly Cookie`를 선택한 이유:**

- 이 앱은 실제 매출·사업자 정보를 다루는 **내부 업무 도구**입니다. 토큰 탈취 시 다른 사용자의 작업·매출 데이터에 접근할 수 있어 피해 범위가 큽니다.
- Next.js App Router는 서버 컴포넌트에서 `cookies()`로 자연스럽게 쿠키에 접근할 수 있어 별도 클라이언트 처리가 불필요합니다.
- `SameSite=Lax`로 CSRF도 방어합니다.

추가로 Timing attack 방어를 위해, 존재하지 않는 계정으로 로그인 시도 시에도 동일한 bcrypt 비교를 실행해 응답 시간 차이로 계정 존재 여부를 추론할 수 없도록 했습니다.

```ts
// 존재하지 않는 계정도 bcrypt 비교를 실행해 응답 시간 동일하게 유지
if (!user) {
  await verifyPassword(password, "$2a$12$invalidhashfortimingprotection...");
  return NextResponse.json(
    { error: "아이디 또는 비밀번호가 올바르지 않습니다" },
    { status: 401 },
  );
}
```

---

### 3. Prisma 싱글턴 — 개발 환경의 연결 누수 방지

**문제:** Next.js 개발 서버는 코드 변경 시 변경된 모듈만 재실행합니다. `lib/prisma.ts`가 재실행될 때마다 `new PrismaClient()`가 호출되어 DB 연결이 계속 새로 생성됐고, "10 Prisma Clients already connected" 경고가 발생했습니다.

**해결:** `globalThis`에 인스턴스를 캐싱합니다. `globalThis`는 모듈 시스템의 캐싱과 별개로 프로세스가 살아있는 한 유지되기 때문에, 핫 리로드 후에도 동일한 인스턴스를 재사용합니다. 단, 프로덕션(Vercel 서버리스)에서는 함수 인스턴스마다 독립적이므로 캐싱하지 않습니다.

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// 개발 환경에서만 globalThis에 캐싱
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

### 4. Hydration 불일치 — 테마/폰트 적용 타이밍

**문제:** 다크/라이트 테마와 글자 크기를 `localStorage`에서 읽어 `<html>` 클래스에 적용하는 구조에서 두 가지 문제가 발생했습니다.

1. **Flash:** 서버에서 `dark`로 렌더링된 페이지가 클라이언트에 도달한 후 `light`로 바뀌면서 흰 화면이 순간적으로 번쩍이는 현상
2. **Hydration Error:** 서버 렌더링된 `className="dark"`와 클라이언트가 변경한 `className="light"`가 달라 React가 DOM 불일치를 감지

**해결:** `<head>` 안에 인라인 스크립트를 삽입해 React 실행 전에 `localStorage`를 읽어 클래스를 적용합니다. 스크립트는 `<body>` 렌더링 전에 실행되므로 flash가 발생하지 않습니다. `suppressHydrationWarning`은 `<html>` 태그에만 적용해 범위를 최소화했습니다.

```tsx
// app/layout.tsx
<html suppressHydrationWarning>
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

> `dangerouslySetInnerHTML`을 사용하지만 이 스크립트는 사용자 입력을 포함하지 않으며, `localStorage` 값은 `classList.add`에만 사용되어 XSS 위험이 없습니다.

---

### 5. 숫자 입력 UX — 상태 타입 설계의 중요성

**문제:** 장비 등록 폼에서 `rate`, `insFee` 등 숫자 필드의 초기값이 `0`(number)으로 설정되어 있었습니다. 사용자가 클릭 후 바로 타이핑하면 `0` 뒤에 숫자가 붙어 `0150000` 같은 값이 입력됐습니다. `onChange`에서 `Number(e.target.value)`를 즉시 호출하면 `""` → `0`으로 재변환되어 단순히 onFocus에서 값을 지우는 것만으로는 해결이 안 됐습니다.

**근본 원인 분석:** 상태 타입이 `number`이기 때문에 빈 문자열 상태를 유지할 수 없었습니다. React 제어 컴포넌트에서 `value={0}`이면 `""` 입력이 즉시 `0`으로 되돌아갑니다.

**해결:** 폼 상태 타입을 `number` → `string`으로 변경했습니다. UI 레이어에서는 문자열로 관리하고, 저장 시점에만 `Number()`로 변환합니다. 이는 HTML 입력의 본질(항상 문자열)에 맞는 타입 설계입니다.

```ts
// Before: number 타입 → onChange에서 "" → 0 재변환
interface FormState { rate: number; insFee: number; ... }
onChange={(e) => set("rate", Number(e.target.value))}  // "" → 0

// After: string 타입 → 저장 시에만 변환
interface FormState { rate: string; insFee: string; ... }
onChange={(e) => set("rate", e.target.value)}           // "" 유지
// handleSave에서만:
rate: Number(form.rate) || 0
```

---

### 6. HTTP 헤더 인코딩 — 런타임 에러 디버깅

**문제:** Middleware에서 `res.headers.set("x-user-name", payload.name)` 호출 시 한글 이름이 포함된 경우 `Cannot convert argument to a ByteString because the character at index 0 has a value of 45208 which is greater than 255` 오류가 발생했습니다. HTTP/1.1 스펙(RFC 7230)은 헤더 값으로 ISO-8859-1(Latin-1) 범위만 허용합니다.

이 에러의 의미있는 점은 **로컬에서는 정상 동작**했다는 것입니다. 로컬 Node.js는 일부 한글 문자를 허용하지만, Vercel의 엣지 런타임은 스펙을 엄격하게 적용합니다. 배포 환경에서만 재현되는 에러였습니다.

**해결:** `x-user-name` 헤더는 어떤 라우트에서도 실제로 사용되지 않고 있었습니다. 불필요한 헤더를 제거하고, 꼭 필요한 `x-user-id`와 `x-user-role`(ASCII만 사용)만 전달했습니다.

---

### 7. DB 장애 대응 — 비상 데이터 접근

**문제:** SQLite 단일 파일이나 외부 DB 연결이 끊기면 매출·작업 데이터에 접근하는 방법이 전혀 없습니다. 특히 현장에서 실시간으로 데이터를 확인해야 하는 상황에서 DB 장애는 업무 마비로 이어집니다.

**설계 결정:**

- 모든 write API 성공 직후 `writeBackup()`으로 전체 스냅샷을 `.backup/emergency.json`에 저장
- `writeBackup()`은 try-catch로 감싸 백업 실패가 실제 응답 성공/실패에 영향을 주지 않음
- `/emergency` 페이지는 Prisma를 전혀 사용하지 않고, JWT 쿠키만으로 인증 후 파일을 직접 읽어 조회

이 방식의 트레이드오프: 백업 파일이 항상 최신 상태임을 보장하지 않습니다(마지막 성공 write 시점). 실시간 복구는 불가능하지만, 중요한 데이터를 최소한 조회할 수 있는 안전망 역할을 합니다.

```ts
// 모든 write 라우트 공통 패턴 — best-effort, never throws
const work = await upsertWork(session.sub, parsed.data);
await writeBackup();
return NextResponse.json({ ok: true, data: work });
```

---

## 🛠 기술 스택

```
Frontend    Next.js 15 (App Router) · React 19 · TypeScript 5
Styling     Tailwind CSS v3 · CSS Custom Properties
State       Zustand
Database    PostgreSQL (Supabase) — 로컬 개발 시 SQLite
ORM         Prisma 5
Auth        jose (JWT HS256) · bcryptjs · httpOnly Cookie
Validation  Zod
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

> Prisma CLI는 `.env.local`을 읽지 못합니다. `.env`도 별도로 생성해 주세요.

```bash
cp .env.local .env
npm run db:push         # 테이블 생성
npm run dev             # → http://localhost:3000
```

> 최초 회원가입 계정이 자동으로 **admin** 권한을 갖습니다.

---

### Vercel + Supabase 배포

**1. Supabase 프로젝트 생성**

[supabase.com](https://supabase.com) → New project → **Project Settings → Database → Connection string → Transaction** 탭 (포트 `6543`) URL 복사

**2. 테이블 생성 (1회)**

```bash
# .env.local의 DATABASE_URL을 Supabase URL로 교체 후
cp .env.local .env
npm run db:push
```

**3. Vercel 환경변수 설정**

| Key            | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PW]@...supabase.com:6543/postgres` |
| `JWT_SECRET`   | 32자 이상 랜덤 문자열                                            |

**4. 배포 확인**

```
https://[배포주소]/api/health → {"ok": true, "db": "connected"}
```

---

### 유용한 스크립트

```bash
npm run dev          # 개발 서버
npm run db:push      # 스키마 → DB 적용
npm run db:studio    # Prisma Studio GUI
npm run db:seed      # 기본 admin 계정 생성 (admin / admin1234)
```

---

## 🔒 보안 설계

| 항목          | 구현                                                            |
| ------------- | --------------------------------------------------------------- |
| 인증 토큰     | `httpOnly` + `Secure` + `SameSite=Lax` — JS 접근 불가, XSS 방어 |
| 비밀번호      | bcrypt 12 rounds                                                |
| Timing attack | 미존재 계정도 동일 bcrypt 비교 수행                             |
| JWT 시크릿    | 32자 미만 시 프로덕션 기동 불가                                 |
| 관리자 보호   | Middleware + API 이중 역할 검증                                 |
| 마지막 어드민 | 역할 변경·삭제 차단                                             |
| 데이터 격리   | 모든 쿼리에 `userId` 조건                                       |
| HTTP 헤더     | 한글 포함 필드 헤더 전달 금지 (RFC 7230)                        |

---

## 📄 라이선스

MIT

---

<div align="center">
  <sub>Built with Next.js + Prisma + Supabase · Deployed on Vercel 🚜</sub>
</div>
