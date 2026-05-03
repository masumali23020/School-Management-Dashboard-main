/** Must match everywhere we sign or verify the superadmin JWT (Edge middleware + server actions). */
export function superAdminJwtSecret(): string {
  return (
    process.env.SUPER_ADMIN_JWT_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "fallback-secret"
  );
}
