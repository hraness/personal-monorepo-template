import type { ReactNode } from "react";

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function JsonLdScript({
  data,
  id,
}: Readonly<{ data: unknown; id: string }>): ReactNode {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
      id={id}
      type="application/ld+json"
    />
  );
}
