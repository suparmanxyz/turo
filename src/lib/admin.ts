/** Email yang punya akses admin panel + admin API. (Aman dipakai di client.) */
const ADMIN_EMAILS = new Set<string>([
  "suparmanpirates@gmail.com",
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
