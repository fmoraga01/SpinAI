interface Entry {
  name: string;
  url: string;
  description: string;
}

interface Category {
  category: string;
  entries: Entry[];
}

function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <style>{`
        .soa-landscape-entry {
          transition: border-color 150ms ease-out, background 150ms ease-out, transform 150ms ease-out;
        }
        .soa-landscape-entry:hover {
          border-color: rgba(91,108,255,0.35);
          background: #2C40FF0d;
          transform: translateX(2px);
        }
      `}</style>
      {categories.map((cat) => (
        <div
          key={cat.category}
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "18px 20px",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-primary)", margin: "0 0 12px" }}>
            {cat.category}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {cat.entries.map((entry) => (
              <a
                key={entry.name}
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="soa-landscape-entry"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  textDecoration: "none",
                  padding: "8px",
                  margin: "0 -8px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid transparent",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-border)",
                    color: "var(--color-tertiary)",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {initials(entry.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: 0 }}>{entry.name}</p>
                  <p style={{ fontSize: 12, color: "var(--color-tertiary)", margin: "2px 0 0", lineHeight: "17px" }}>
                    {entry.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
