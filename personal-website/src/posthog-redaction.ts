import type { BeforeSendFn, Properties } from "posthog-js";

const requiredIngestionProperties = Object.freeze([
  "token",
  "distinct_id",
  "$device_id",
  "$cookieless_mode",
  "$lib",
  "$lib_version",
] as const);

/** Keep one root pageview useful while dropping browser, referrer, and campaign context. */
export function createRootPageviewFilter(canonicalOrigin: string): BeforeSendFn {
  const canonical = new URL(canonicalOrigin);
  return (event) => {
    if (event === null || event.event !== "$pageview") return null;

    const properties: Properties = {
      $current_url: `${canonical.origin}/`,
      $host: canonical.host,
      $pathname: "/",
      $process_person_profile: false,
    };
    for (const key of requiredIngestionProperties) {
      const value = event.properties[key];
      if (value !== undefined) properties[key] = value;
    }

    return {
      event: "$pageview",
      properties,
      timestamp: event.timestamp,
      uuid: event.uuid,
    };
  };
}
