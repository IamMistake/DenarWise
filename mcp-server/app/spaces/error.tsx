"use client";

export default function SpacesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="hs">
      <div className="hs-wrap hs-dash">
        <div className="hs-empty" role="alert">
          <span className="hs-empty-art" aria-hidden="true" style={{ background: "var(--color-peach)", fontSize: 44, fontWeight: 800 }}>!</span>
          <div>
            <h2>We could not load your spaces.</h2>
            <p>Your lists are safe. Check your connection and try again. If it keeps happening, make sure the database migrations have run.</p>
            <div className="hs-actions">
              <button type="button" className="hs-btn hs-btn--small hs-btn--green" onClick={reset}>Try again</button>
              <a className="hs-btn hs-btn--small" href="/">Back home</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
