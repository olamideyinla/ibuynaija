/**
 * JsonLd — renders a <script type="application/ld+json"> block.
 *
 * Uses HTML-safe JSON serialisation: < > & are Unicode-escaped so that no
 * user-supplied text (e.g. "</script>" in a product description) can break the
 * surrounding HTML document, while staying valid JSON for parsers.
 *
 * No 'use client' — this is a server-only component; JSON-LD must be present
 * in the initial HTML for crawlers, never hydrated client-side.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
