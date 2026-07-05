"use client";

import { useState } from "react";
import { companyLogoUrl } from "@/lib/companyLogos";

export default function CompanyLogo({ slug, name }: { slug: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const url = companyLogoUrl(slug);

  if (!url || failed) {
    return (
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "var(--radius-md)",
          background: "var(--color-border)",
          color: "var(--color-tertiary)",
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={20}
      height={20}
      onError={() => setFailed(true)}
      style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }}
    />
  );
}
