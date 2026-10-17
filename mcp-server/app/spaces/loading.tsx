export default function SpacesLoading() {
  return (
    <main className="hs" aria-busy="true">
      <div className="hs-wrap hs-dash" role="status" aria-label="Loading your spaces">
        <div className="hs-skeleton" style={{ height: 64, width: "min(460px, 80%)" }} />
        <div className="hs-skeleton" style={{ height: 180, marginTop: 32 }} />
        <div className="hs-space-grid" style={{ marginTop: 40 }}>
          <div className="hs-skeleton" style={{ height: 380 }} />
          <div className="hs-skeleton" style={{ height: 380 }} />
        </div>
      </div>
    </main>
  );
}
