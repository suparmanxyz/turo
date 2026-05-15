/** Email yang punya akses admin panel + admin API. (Aman dipakai di client.) */
const ADMIN_EMAILS = new Set<string>([
  "suparmanpirates@gmail.com",
]);

/** Email reviewer — staff yang ditugaskan cek soal di /reviewer/review-soal. */
const REVIEWER_EMAILS = new Set<string>([
  // Tambah email reviewer di sini, contoh:
  // "reviewer1@example.com",
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}

export function isReviewerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return REVIEWER_EMAILS.has(email.toLowerCase());
}

export function isAdminOrReviewerEmail(email: string | null | undefined): boolean {
  return isAdminEmail(email) || isReviewerEmail(email);
}
