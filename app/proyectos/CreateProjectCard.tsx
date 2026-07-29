"use client";

export default function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ all: "unset", display: "block", width: "100%", cursor: "pointer" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          height: "100%",
          minHeight: 120,
          padding: 18,
          boxSizing: "border-box",
          background: "#2C40FF0f",
          border: "1px dashed #2C40FF44",
          borderRadius: "var(--radius-md)",
          transition: "border-color 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2C40FF55"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2C40FF44"; }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            background: "#2C40FF1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C40FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>Crear proyecto</span>
      </div>
    </button>
  );
}
