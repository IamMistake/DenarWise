"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ pendingLabel, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
      <span aria-live="polite">{pending ? pendingLabel : children}</span>
    </button>
  );
}

export function Toast({ tone, message }: { tone: "success" | "error"; message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (tone === "error") return;
    const timer = setTimeout(() => setVisible(false), 7000);
    return () => clearTimeout(timer);
  }, [tone]);

  if (!visible) return null;

  return (
    <div className={`hs-toast ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="hs-toast-icon" aria-hidden="true">{tone === "error" ? "!" : "✓"}</span>
      <strong>{tone === "error" ? "Could not update" : "Done"}</strong>
      <p>{message}</p>
      <button type="button" aria-label="Dismiss message" onClick={() => setVisible(false)}>×</button>
    </div>
  );
}

export function LeaveSpace({
  spaceId,
  spaceName,
  action
}: {
  spaceId: string;
  spaceName: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="hs-leave">
        <button type="button" className="hs-leave-link" onClick={() => setConfirming(true)} aria-label={`Leave ${spaceName}`}>
          Leave space
        </button>
      </div>
    );
  }

  return (
    <form className="hs-leave" action={action}>
      <input type="hidden" name="spaceId" value={spaceId} />
      <LeaveConfirmation spaceName={spaceName} onCancel={() => setConfirming(false)} />
    </form>
  );
}

function LeaveConfirmation({ spaceName, onCancel }: { spaceName: string; onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="hs-leave-confirm" role="group" aria-label={`Confirm leaving ${spaceName}`}>
      <span>Leave {spaceName}?</span>
      <SubmitButton className="hs-btn hs-btn--small hs-btn--danger" pendingLabel="Leaving…">Yes, leave</SubmitButton>
      <button type="button" className="hs-btn hs-btn--small" onClick={onCancel} disabled={pending} autoFocus>Stay</button>
    </div>
  );
}
