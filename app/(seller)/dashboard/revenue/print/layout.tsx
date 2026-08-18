/**
 * Bare layout for the print page — no navbar or shell chrome.
 * The root layout still provides <html> and <body>; this just
 * passes children through so the print page owns its full viewport.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
