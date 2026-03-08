import Stripe from "stripe";

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
  { apiVersion: "2026-02-25.clover" }
);

export function assertStripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key || key.includes("REPLACE_ME") || !key.startsWith("sk_")) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to a real Stripe secret key.");
  }
}
