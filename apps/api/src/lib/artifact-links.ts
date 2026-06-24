export function webOpenArtifactPath(slug: string): string {
  return `/open/${slug}`;
}

export function webOpenArtifactUrl(webUrl: string, slug: string): string {
  return `${webUrl.replace(/\/$/, "")}${webOpenArtifactPath(slug)}`;
}

export function webLoginForArtifactUrl(webUrl: string, slug: string, email?: string): string {
  const params = new URLSearchParams({ next: webOpenArtifactPath(slug) });
  if (email) params.set("email", email);
  return `${webUrl.replace(/\/$/, "")}/login?${params.toString()}`;
}
