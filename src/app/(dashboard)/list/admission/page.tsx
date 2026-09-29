import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserRoleAuth } from "@/lib/logsessition";
import prisma from "@/lib/db";
import {
  getAdmissionApplications,
  getAdmissionClasses,
  getAdmissionDashboardStats,
  getAdmissionSessions,
} from "@/Actions/admission/admission.actions";
import AdmissionApplicationsTable from "@/components/admission/AdmissionApplicationsTable";
import AdmissionSessionManager from "@/components/admission/AdmissionSessionManager";
import AdmissionClassManager from "@/components/admission/AdmissionClassManager";
import AdmissionSettingsForm from "@/components/admission/AdmissionSettingsForm";

export const metadata = { title: "Admission Management" };

type SearchParams = { [key: string]: string | undefined };

async function DashboardStats({ sessionId }: { sessionId?: number }) {
  const stats = await getAdmissionDashboardStats(sessionId);

  const cards = [
    { label: "Total Applications", value: stats.total, color: "text-slate-700" },
    { label: "Payment Pending", value: stats.paymentPending, color: "text-amber-600" },
    { label: "Payment Verified", value: stats.paymentVerified, color: "text-blue-600" },
    { label: "Under Review", value: stats.underReview, color: "text-violet-600" },
    { label: "Approved", value: stats.approved, color: "text-indigo-600" },
    { label: "Confirmed", value: stats.confirmed, color: "text-emerald-600" },
    { label: "Rejected", value: stats.rejected, color: "text-rose-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ClassWiseStats({ sessionId }: { sessionId?: number }) {
  const stats = await getAdmissionDashboardStats(sessionId);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.classWise.map((c) => (
        <Card key={c.className}>
          <CardHeader className="pb-2">
            <CardTitle>{c.className}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-muted p-2">
              <p className="text-xs text-muted-foreground">Applications</p>
              <p className="font-bold">{c.applications}</p>
            </div>
            <div className="rounded-md bg-muted p-2">
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="font-bold text-emerald-600">{c.confirmed}</p>
            </div>
            <div className="rounded-md bg-muted p-2">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-bold text-amber-600">{c.pending}</p>
            </div>
            <div className="rounded-md bg-muted p-2">
              <p className="text-xs text-muted-foreground">Available Seats</p>
              <p className="font-bold">{c.availableSeats}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ApplicationsSection({ searchParams }: { searchParams: SearchParams }) {
  const data = await getAdmissionApplications({
    sessionId: searchParams.sessionId,
    classId: searchParams.classId,
    applicationStatus: searchParams.applicationStatus,
    paymentStatus: searchParams.paymentStatus,
    search: searchParams.search,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
    page: searchParams.page,
  });

  const { schoolId } = await getUserRoleAuth();
  const [sessions, classes] = await Promise.all([
    prisma.admissionSession.findMany({
      where: { schoolId: Number(schoolId) },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: Number(schoolId) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdmissionApplicationsTable
      items={data.items}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      sessions={sessions}
      classes={classes}
      filters={searchParams}
    />
  );
}

export default async function AdmissionManagementPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { role, schoolId } = await getUserRoleAuth();
  const normalizedRole = role?.toLowerCase() ?? "";
  if (!["admin", "cashier"].includes(normalizedRole)) redirect("/");

  const sessionId = searchParams.sessionId ? Number(searchParams.sessionId) : undefined;

  const [sessionsRes, classesRes, setting] = await Promise.all([
    getAdmissionSessions(),
    getAdmissionClasses(),
    prisma.admissionSetting.findUnique({
      where: { schoolId: Number(schoolId) },
    }),
  ]);

  const sessions =
    sessionsRes.success && Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
  const admissionClasses =
    classesRes.success && Array.isArray(classesRes.data) ? classesRes.data : [];
  const schoolClasses = await prisma.class.findMany({
    where: { schoolId: Number(schoolId) },
    include: { grade: true },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  const settingsInitial = setting ?? {
    admissionEnabled: false,
    bkashNumber: "",
    paymentInstruction: "",
    applicationPrefix: "APP",
    admissionPrefix: "ADM",
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admission Management</h1>
        <p className="text-muted-foreground">
          Manage sessions, classes, applications and confirmations
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        }
      >
        <DashboardStats sessionId={sessionId} />
      </Suspense>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="classes">Class Stats</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="class-config">Class Config</TabsTrigger>
          {normalizedRole === "admin" && (
            <TabsTrigger value="settings">Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="applications">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ApplicationsSection searchParams={searchParams} />
          </Suspense>
        </TabsContent>

        <TabsContent value="classes">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <ClassWiseStats sessionId={sessionId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="sessions">
          <AdmissionSessionManager
            sessions={sessions as never}
            isAdmin={normalizedRole === "admin"}
          />
        </TabsContent>

        <TabsContent value="class-config">
          <AdmissionClassManager
            sessions={sessions.map((s: { id: number; name: string; academicYear: string }) => ({
              id: s.id,
              name: s.name,
              academicYear: s.academicYear,
            }))}
            schoolClasses={schoolClasses}
            admissionClasses={admissionClasses as never}
            isAdmin={normalizedRole === "admin"}
          />
        </TabsContent>

        {normalizedRole === "admin" && (
          <TabsContent value="settings">
            <AdmissionSettingsForm initial={settingsInitial} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
