# School Result & Assignment Mark Entry System

Complete production-ready implementation for Next.js App Router + Prisma + PostgreSQL + Clerk.

---

## 📁 File Structure

```
your-project/
├── lib/
│   ├── db.ts                              ← Prisma singleton
│   ├── validations/
│   │   └── result.schema.ts               ← Zod schemas
│   ├── queries/
│   │   └── result.queries.ts              ← All Prisma queries
│   └── actions/
│       ├── assignment.actions.ts           ← Server Actions: assignment marks
│       └── exam.actions.ts                ← Server Actions: exam results
│
├── hooks/
│   └── useResultData.ts                   ← Client-side data hooks + types
│
├── app/
│   ├── api/
│   │   └── teacher/
│   │       ├── classes/route.ts           ← GET /api/teacher/classes
│   │       └── subjects/route.ts          ← GET /api/teacher/subjects?classId=
│   └── (dashboard)/
│       └── result/
│           └── page.tsx                   ← Server component (SSR + auth)
│
└── components/
    └── result/
        ├── ResultPageClient.tsx           ← Client shell + all styles
        ├── AssignmentMode.tsx             ← Assignment mark entry
        └── ExamMode.tsx                   ← Exam result entry
```

---

## 🚀 Setup

### 1. Install dependencies

```bash
npm install @clerk/nextjs sonner react-hook-form @hookform/resolvers zod
```

### 2. Add Sonner toaster to your root layout

```tsx
// app/layout.tsx
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ClerkProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
```

### 3. Clerk middleware

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
```

### 4. Environment variables

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/school_db"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

### 5. Clerk userId = Teacher.id

The system assumes **Teacher.id in your DB = Clerk userId**.
When you create a teacher via Clerk webhook, store the Clerk `userId` as `Teacher.id`.

---

## 🔑 Key Design Decisions

| Decision | Reason |
|---|---|
| Server Actions for mutations | No extra API routes needed, type-safe end-to-end |
| API Routes for GET data | Allows client-side refetching without full page reload |
| Upsert pattern (create or update) | Prevents duplicate entries, supports editing |
| `db.$transaction()` for bulk saves | Atomic — all succeed or all fail |
| Grade level from DB | Primary (1–5) vs Secondary (6–10) auto-detected |
| `revalidatePath` after saves | Keeps dashboard/result pages fresh |

---

## 📋 How Data Flows

### Assignment Mode
1. Teacher selects class + subject
2. `getAssignmentAction()` → finds assignment via `ClassSubjectTeacher → Lesson → Assignment`
3. Loads all students in that class
4. Loads existing `Result` records (for edit mode)
5. Teacher fills marks → `saveAssignmentMarksAction()` → bulk upsert

### Exam Mode
1. Teacher selects class
2. `getClassExamDataAction()` → loads students + subjects + exams for that class
3. Auto-detects grade level (primary vs secondary UI)
4. Loads existing `Result` records
5. Teacher fills marks → `saveExamResultsAction()` → bulk upsert

---

## ⚠️ Important Notes

- **Sonner** is used for toast notifications. Install it: `npm install sonner`
- The `teacher.id` in DB must match Clerk's `userId`
- For secondary level, MCQ max = 30, Written max = 60, total auto-calculates
- For primary level, single score max = 100
- All saves use transactions — partial failures are prevented
