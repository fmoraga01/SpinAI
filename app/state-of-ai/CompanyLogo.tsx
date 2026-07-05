import { companyLogo } from "@/lib/companyLogos";

export default function CompanyLogo({ slug, name }: { slug: string | null; name: string }) {
  const logo = companyLogo(slug);

  if (!logo) {
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
    <svg
      viewBox={logo.viewBox}
      width={20}
      height={20}
      fill="#fff"
      fillRule="evenodd"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {logo.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
