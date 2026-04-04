// lib/subscription-guard.ts
// Feature locking + access control based on planType and isActive status.
// Used in middleware, Server Actions, and API Route Handlers.

import type { PlanType } from "@/types/auth";

// ─── Feature definitions ───────────────────────────────────────────────────────
// Each feature maps to the minimum plan required to access it.
// Ordering: FREE < STANDARD < POPULAR

export type Feature =
  | "sms_panel"
  | "analytics"
  | "advanced_reports"
  | "bulk_import"
  | "custom_branding"
  | "api_access";

const PLAN_HIERARCHY: Record<PlanType, number> = {
  FREE:     0,
  STANDARD: 1,
  POPULAR:  2,
};

const FEATURE_MINIMUM_PLAN: Record<Feature, PlanType> = {
  sms_panel:        "POPULAR",
  analytics:        "POPULAR",
  advanced_reports: "STANDARD",
  bulk_import:      "STANDARD",
  custom_branding:  "POPULAR",
  api_access:       "STANDARD",
};

// ─── Core check functions ─────────────────────────────────────────────────────

/** Returns true if the given plan can access the feature. */
export function canAccessFeature(plan: PlanType, feature: Feature): boolean {
  const required = PLAN_HIERARCHY[FEATURE_MINIMUM_PLAN[feature]];
  const current  = PLAN_HIERARCHY[plan];
  return current >= required;
}

/** Returns the minimum plan name required for a feature. */
export function requiredPlanFor(feature: Feature): PlanType {
  return FEATURE_MINIMUM_PLAN[feature];
}

/** Returns all features accessible by the given plan. */
export function accessibleFeatures(plan: PlanType): Feature[] {
  return (Object.keys(FEATURE_MINIMUM_PLAN) as Feature[]).filter(
    (f) => canAccessFeature(plan, f)
  );
}

// ─── School status check ───────────────────────────────────────────────────────

export type SchoolStatusResult =
  | { allowed: true;  planType: PlanType }
  | { allowed: false; reason: "SCHOOL_DISABLED" | "SUBSCRIPTION_EXPIRED" };

export function checkSchoolStatus(school: {
  isActive: boolean;
  expiredAt: Date | null;
  plan: { name: PlanType };
}): SchoolStatusResult {
  if (!school.isActive) {
    return { allowed: false, reason: "SCHOOL_DISABLED" };
  }
  if (school.expiredAt && school.expiredAt < new Date()) {
    return { allowed: false, reason: "SUBSCRIPTION_EXPIRED" };
  }
  return { allowed: true, planType: school.plan.name };
}

// ─── API Route guard (use in Route Handlers) ──────────────────────────────────
// Returns a NextResponse 403 if the plan doesn't support the feature,
// or null if access is granted.

import { NextResponse } from "next/server";

export function guardFeatureAccess(
  plan: PlanType,
  feature: Feature
): NextResponse | null {
  if (!canAccessFeature(plan, feature)) {
    return NextResponse.json(
      {
        error:       "PLAN_INSUFFICIENT",
        message:     `This feature requires the ${requiredPlanFor(feature)} plan or higher.`,
        requiredPlan: requiredPlanFor(feature),
        currentPlan:  plan,
      },
      { status: 403 }
    );
  }
  return null; // access granted
}

// ─── Usage examples (not exported, for documentation only) ────────────────────
//
// In a Route Handler:
//   const blocked = guardFeatureAccess(session.user.planType, "sms_panel");
//   if (blocked) return blocked;
//
// In a Server Component:
//   const canUseSMS = canAccessFeature(user.planType, "sms_panel");
//
// In middleware:
//   const status = checkSchoolStatus(school);
//   if (!status.allowed) redirect("/suspended");