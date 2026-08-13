export interface PublicAnalyticsEnvironment {
  readonly NEXT_PUBLIC_POSTHOG_HOST?: string;
  readonly NEXT_PUBLIC_POSTHOG_KEY?: string;
  readonly NEXT_PUBLIC_SITE_URL?: string;
}

export interface PostHogBrowserConfiguration {
  readonly apiHost: string;
  readonly apiKey: string;
  readonly canonicalOrigin: string;
}

/** Return a config only when every value describes a canonical HTTPS deployment. */
export function optionalPostHogConfiguration(
  environment: PublicAnalyticsEnvironment,
): PostHogBrowserConfiguration | null {
  const rawSite = environment.NEXT_PUBLIC_SITE_URL;
  const rawHost = environment.NEXT_PUBLIC_POSTHOG_HOST;
  const apiKey = environment.NEXT_PUBLIC_POSTHOG_KEY;
  if (!rawSite || !rawHost || !apiKey?.startsWith("phc_")) return null;

  try {
    const site = new URL(rawSite);
    const host = new URL(rawHost);
    if (
      site.protocol !== "https:"
      || site.username !== ""
      || site.password !== ""
      || site.pathname !== "/"
      || site.search !== ""
      || site.hash !== ""
      || host.protocol !== "https:"
      || host.username !== ""
      || host.password !== ""
      || host.pathname !== "/"
      || host.search !== ""
      || host.hash !== ""
    ) {
      return null;
    }
    return Object.freeze({
      apiHost: host.origin,
      apiKey,
      canonicalOrigin: site.origin,
    });
  } catch {
    return null;
  }
}
