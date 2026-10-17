"use client";

import { FormEvent, useState } from "react";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type SubscribePayload = {
  data?: { status?: "subscribed" | "already_subscribed" };
  errors?: Array<{ message?: string }>;
};

export function MarketplaceNotificationForm() {
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    setState({ kind: "loading" });

    try {
      const response = await fetch("/api/marketplace-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await response.json().catch(() => null) as SubscribePayload | null;

      if (!response.ok) {
        throw new Error(payload?.errors?.[0]?.message || "We could not save your email. Please try again.");
      }

      form.reset();
      setState({
        kind: "success",
        message: payload?.data?.status === "already_subscribed"
          ? "You’re already on the list. We’ll let you know when HomeSpace launches."
          : "You’re on the list. We’ll email you as soon as HomeSpace is available."
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "We could not save your email. Please try again."
      });
    }
  }

  const isLoading = state.kind === "loading";

  return (
    <form className="editorial-marketplace-form" onSubmit={handleSubmit}>
      <label htmlFor="marketplace-email">Email address</label>
      <div>
        <input
          id="marketplace-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={isLoading}
          aria-describedby="marketplace-form-status"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Joining…" : "Notify me"}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p
        id="marketplace-form-status"
        className={`editorial-form-status ${state.kind}`}
        role={state.kind === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {state.kind === "success" || state.kind === "error" ? state.message : "Only launch updates. No shopping spam."}
      </p>
    </form>
  );
}
