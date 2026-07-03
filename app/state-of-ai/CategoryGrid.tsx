interface Entry {
  name: string;
  url: string;
  description: string;
}

interface Category {
  category: string;
  entries: Entry[];
}

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {categories.map((cat) => (
        <div key={cat.category}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-primary)", margin: "0 0 10px" }}>
            {cat.category}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cat.entries.map((entry) => (
              <a
                key={entry.name}
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  textDecoration: "none",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{entry.name}</span>
                <span style={{ fontSize: 12, color: "var(--color-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.description}
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
