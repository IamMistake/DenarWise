import { notFound } from "next/navigation";

// Every in-chat widget state side by side, rendered from the real bundle with SAMPLE data.
const states = [
  ["matching", "1. Matching"],
  ["compare", "2. Review and compare"],
  ["ready", "3. Ready to confirm"],
  ["saved", "4. Saved"],
  ["list", "5. Shopping list"],
  ["empty", "6. All clear"],
  ["error", "7. Error"]
] as const;

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function PreviewWidget({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const theme = params?.theme === "dark" ? "dark" : "light";
  const width = typeof params?.w === "string" ? Math.min(900, Math.max(300, Number(params.w) || 520)) : 520;

  return (
    <main className="hs" style={{ padding: "32px clamp(16px, 4vw, 48px) 64px", background: theme === "dark" ? "#0e1530" : undefined, colorScheme: theme }}>
      <p className="hs-eyebrow">Widget preview · sample data</p>
      <h1 style={{ margin: "12px 0 8px", fontSize: 48, letterSpacing: "-.05em", color: theme === "dark" ? "#f2f5ff" : undefined }}>In-chat shopping widget</h1>
      <p style={{ margin: "0 0 28px", color: theme === "dark" ? "#a9b1cf" : "var(--color-muted)" }}>
        <a href="?" style={{ textDecoration: "underline" }}>Light</a> · <a href="?theme=dark" style={{ textDecoration: "underline" }}>Dark</a> · <a href="?w=360" style={{ textDecoration: "underline" }}>Narrow (360)</a>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
        {states.map(([key, label]) => (
          <figure key={key} style={{ margin: 0, width }}>
            <figcaption className="hs-label" style={{ marginBottom: 8, color: theme === "dark" ? "#a9b1cf" : undefined }}>{label}</figcaption>
            <iframe
              title={label}
              src={`/preview/widget/frame?mock=${key}&theme=${theme}`}
              style={{ width: "100%", height: key === "compare" ? 1100 : 760, border: "1px dashed #8a8c84", background: "transparent", colorScheme: theme }}
            />
          </figure>
        ))}
      </div>
    </main>
  );
}
