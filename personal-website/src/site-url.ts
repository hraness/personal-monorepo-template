const FALLBACK_SITE_ORIGIN = "https://example.com";

export function canonicalSiteOrigin(input: string | undefined): string {
  if (input === undefined || input.trim().length === 0) return FALLBACK_SITE_ORIGIN;
  try {
    const parsed = new URL(input);
    if (
      parsed.protocol !== "https:"
      || parsed.username !== ""
      || parsed.password !== ""
      || parsed.pathname !== "/"
      || parsed.search !== ""
      || parsed.hash !== ""
    ) {
      return FALLBACK_SITE_ORIGIN;
    }
    return parsed.origin;
  } catch {
    return FALLBACK_SITE_ORIGIN;
  }
}
