export function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("880")) {
    return digits.slice(-11);
  }
  return digits.slice(-11);
}

export function mobileMatchesApplication(
  mobile: string,
  app: {
    fatherMobile: string;
    motherMobile?: string | null;
    guardianMobile?: string | null;
  }
): boolean {
  const normalized = normalizeMobile(mobile);
  if (normalized.length < 10) return false;

  const candidates = [app.fatherMobile, app.motherMobile, app.guardianMobile].filter(
    Boolean
  ) as string[];

  return candidates.some((phone) => normalizeMobile(phone) === normalized);
}

export function buildVerificationUrl(
  baseUrl: string,
  schoolSlug: string,
  applicationNumber: string
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/school/${schoolSlug}/admission/search?applicationNumber=${encodeURIComponent(applicationNumber)}`;
}
