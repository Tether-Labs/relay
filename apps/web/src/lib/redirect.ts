/** Normalize post-auth redirects to same-origin app paths Clerk will accept. */
export function safeNextPath(next: string | null, fallback = "/dashboard"): string {
  if (!next) return fallback;

  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  try {
    const url = new URL(next);
    const artifactMatch = url.pathname.match(/^\/a\/([^/]+)$/);
    if (artifactMatch) {
      return `/open/${artifactMatch[1]}`;
    }
  } catch {
    // ignore invalid URLs
  }

  return fallback;
}
