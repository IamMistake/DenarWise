import { notFound } from "next/navigation";

// Design review index. Only available while developing.
export default function PreviewIndex() {
  if (process.env.NODE_ENV === "production") notFound();

  const links = [
    ["/", "Landing page"],
    ["/preview/spaces", "Spaces dashboard (sample spaces)"],
    ["/preview/spaces?state=empty", "Spaces dashboard, empty"],
    ["/preview/spaces?state=error", "Spaces dashboard, error toast"],
    ["/preview/widget", "In-chat shopping widget, every state"]
  ];

  return (
    <main className="hs" style={{ padding: "48px clamp(20px, 5vw, 72px)" }}>
      <p className="hs-eyebrow">Design preview</p>
      <h1 style={{ margin: "14px 0 28px", fontSize: 56, letterSpacing: "-.05em" }}>Review pages</h1>
      <ul style={{ display: "grid", gap: 10, padding: 0, listStyle: "none", maxWidth: 520 }}>
        {links.map(([href, label]) => (
          <li key={href}><a className="hs-btn" style={{ justifyContent: "space-between", width: "100%" }} href={href}>{label}<span aria-hidden="true">→</span></a></li>
        ))}
      </ul>
    </main>
  );
}
