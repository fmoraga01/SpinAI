"use client";

// Thin client-only wrapper around `next/dynamic({ ssr: false })`. This repo's
// Next.js version disallows `ssr: false` inside a Server Component (see
// node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md, "Importing
// Server Components" — a breaking change from what design.md's snippet
// assumed) — small adjustment vs. design.md: the `dynamic()` call lives here
// instead of directly in `app/page.tsx`, so `app/page.tsx` itself can stay a
// plain Server Component. Three.js/GSAP are still loaded lazily, client-only,
// only on the home route (R21).
import dynamic from "next/dynamic";

const LegoHeroScene = dynamic(() => import("./LegoHeroScene"), {
  ssr: false,
  loading: () => (
    <div
      className="relative w-full"
      style={{
        aspectRatio: "1 / 1",
        minHeight: 320,
        background: "transparent",
      }}
    />
  ),
});

export default function LegoHeroSceneLoader() {
  return <LegoHeroScene />;
}
