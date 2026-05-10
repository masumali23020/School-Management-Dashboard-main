// src/app/list/meals/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UtensilsCrossed,
  Users,
  ReceiptText,
  Settings2,
  TrendingUp,
  CalendarDays,
  Activity,
} from "lucide-react";
import { getMealDashboardStats, getMealsPageData } from "@/Actions/meals/meal.actions";
import { MealEntryForm } from "./MealEntryForm";
import { BulkMealEntry } from "./BulkMealEntry";
import { MealTypeSettings } from "./MealTypeSettings";
import { MonthlyBillSummary } from "./MonthlyBillSummary";
import { MealPaymentDialog } from "./MealPaymentDialog";


// ─── Dashboard stat cards ─────────────────────────────────────────────────────

async function DashboardStats() {
  const stats = await getMealDashboardStats();
  if (!stats) return null;

  const cards = [
    {
      label: "Meals served today",
      value: stats.todayMealsServed.toLocaleString(),
      icon: UtensilsCrossed,
      desc: "All meal types combined",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Today's revenue",
      value: `৳${Number(stats.todayRevenue).toFixed(2)}`,
      icon: TrendingUp,
      desc: "Consumed meals only",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active meal types",
      value: stats.activeMealTypes.toLocaleString(),
      icon: CalendarDays,
      desc: "Available for entry",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Active students (month)",
      value: stats.studentsWithActivityThisMonth.toLocaleString(),
      icon: Activity,
      desc: "With at least one meal",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MealsPage() {
  const pageData = await getMealsPageData();
  if (!pageData) redirect("/sign-in");

  const { mealTypes, sessions, classes, students, school } = pageData;

  // Flat student list for dropdowns that don't need filtering (billing, payment)
  const studentList = students.map((s) => ({
    id: s.id,
    name: `${s.name} ${s.surname}`,
    rollNumber: s.rollNumber,
  }));

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
            Meal management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track daily meals, manage billing, and record payments
          </p>
        </div>
        {/* <MealPaymentForm students={studentList} /> */}
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Tabs */}
      <Tabs defaultValue="entry" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="entry" className="gap-1.5">
            <UtensilsCrossed className="h-4 w-4" />
            <span className="hidden sm:inline">Single entry</span>
            <span className="sm:hidden">Entry</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk entry</span>
            <span className="sm:hidden">Bulk</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <ReceiptText className="h-4 w-4" />
            <span className="hidden sm:inline">Monthly bill</span>
            <span className="sm:hidden">Bill</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Meal types</span>
            <span className="sm:hidden">Setup</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Meal pay</span>
            <span className="sm:hidden">fee</span>
          </TabsTrigger>
        </TabsList>

        {/* Single entry */}
        <TabsContent value="entry">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Log a meal</CardTitle>
                <CardDescription>
                  Filter by academic year and class to narrow the student list,
                  then select the student and record their meal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MealEntryForm
                  mealTypes={mealTypes}
                  sessions={sessions}
                  initialClasses={classes}
                  initialStudents={students}
                />
              </CardContent>
            </Card>

            {/* Info sidebar */}
            <div className="space-y-4">
              <Card className="border-dashed">
                <CardContent className="pt-5 space-y-2">
                  <p className="text-sm font-medium">How filtering works</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Select an academic year (from class history)</li>
                    <li>Pick a class — only classes with enrollments in that year appear</li>
                    <li>Student list narrows to that class + year</li>
                    <li>Select the student and log the meal</li>
                  </ol>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="pt-5 space-y-1.5">
                  <p className="text-sm font-medium">Rate snapshot</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The rate is frozen at entry time. Future price changes wont
                    affect past records.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardContent className="pt-5 space-y-1.5">
                  <p className="text-sm font-medium">Idempotent saves</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Saving the same student + meal + date twice updates the
                    existing record — no duplicates.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Bulk entry */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bulk meal entry</CardTitle>
              <CardDescription>
                Filter by academic year and class, select multiple students,
                then save all their meals at once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkMealEntry
                mealTypes={mealTypes}
                sessions={sessions}
                initialClasses={classes}
                initialStudents={students}
              />
          
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly billing */}
        <TabsContent value="billing">
          <MonthlyBillSummary students={studentList} />
        </TabsContent>

        {/* pay billing */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meal payment configuration</CardTitle>
              <CardDescription>
                Add, edit, or deactivate meal payment methods. Deactivation hides the method

                from entry forms while preserving all historical data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MealPaymentDialog students={studentList} school={school as any} />
            </CardContent>
          </Card> 
        </TabsContent>

        {/* Meal type settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meal type configuration</CardTitle>
              <CardDescription>
                Add, edit, or deactivate meal types. Deactivation hides the type
                from entry forms while preserving all historical data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MealTypeSettings initialMealTypes={mealTypes} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}