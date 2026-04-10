const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://emandme-influencer-portal.vercel.app";

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background:#e11d48;padding:20px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Em &amp; Me Studio</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Em &amp; Me Studio &middot; <a href="${APP_URL}" style="color:#9ca3af;text-decoration:underline;">Creator Portal</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#e11d48;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">${label}</a>`;
}

// ─── Welcome ─────────────────────────────────────────────────────────────────

export function welcomeEmailHtml(firstName: string | null): string {
  const name = firstName ?? "there";
  return wrap(`
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Welcome to Em &amp; Me Studio</h2>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      You're now part of the Em &amp; Me Studio creator family. We're excited to work with you!
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      To get started, complete your profile and connect your bank account so we can send payments your way.
    </p>
    ${btn(`${APP_URL}/influencer/profile`, "Complete Your Profile")}
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
      If you have any questions, just reply to this email - we're here to help.
    </p>
  `);
}

// ─── Shipment shipped ─────────────────────────────────────────────────────────

export function shipmentShippedEmailHtml(options: {
  firstName: string | null;
  products: Array<{ name: string; qty: number }>;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDeliveryAt: Date | string | null;
}): string {
  const name = options.firstName ?? "there";
  const productRows = options.products
    .map(
      (p) =>
        `<li style="margin:4px 0;font-size:14px;color:#374151;">${p.name} &times; ${p.qty}</li>`
    )
    .join("");

  const trackingBlock = options.trackingUrl
    ? btn(options.trackingUrl, "Track Your Package")
    : options.trackingNumber
    ? `<p style="margin:0;font-size:14px;color:#374151;">Tracking number: <strong>${options.trackingNumber}</strong>${options.carrier ? ` via ${options.carrier}` : ""}</p>`
    : "";

  const etaBlock = options.estimatedDeliveryAt
    ? `<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">Estimated delivery: <strong style="color:#374151;">${new Date(
        options.estimatedDeliveryAt
      ).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong></p>`
    : "";

  return wrap(`
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Your package is on its way</h2>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Great news - we've shipped your Em &amp; Me Studio products!
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Items Shipped</p>
      <ul style="margin:0;padding-left:20px;">${productRows}</ul>
      ${options.carrier && !options.trackingUrl ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Carrier: ${options.carrier}</p>` : ""}
    </div>
    ${trackingBlock}
    ${etaBlock}
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
      Questions about your shipment? Just reply to this email.
    </p>
  `);
}

// ─── Payment sent ─────────────────────────────────────────────────────────────

export function paymentSentEmailHtml(options: {
  firstName: string | null;
  amount: number;
  currency: string;
  description: string | null;
}): string {
  const name = options.firstName ?? "there";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options.currency.toUpperCase(),
  }).format(options.amount / 100);

  return wrap(`
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Payment sent</h2>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      We've sent a payment to your connected bank account.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:20px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;font-size:36px;font-weight:700;color:#16a34a;">${formatted}</p>
      ${options.description ? `<p style="margin:8px 0 0;font-size:13px;color:#4b7c60;">${options.description}</p>` : ""}
    </div>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Funds typically arrive within 1-3 business days depending on your bank.
    </p>
    ${btn(`${APP_URL}/influencer/payments`, "View Payments")}
  `);
}

// ─── Payment failed ───────────────────────────────────────────────────────────

export function paymentFailedEmailHtml(options: {
  firstName: string | null;
  amount: number;
  currency: string;
  reason: string | null;
}): string {
  const name = options.firstName ?? "there";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options.currency.toUpperCase(),
  }).format(options.amount / 100);

  return wrap(`
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Payment could not be processed</h2>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Unfortunately, your payment of <strong>${formatted}</strong> could not be processed.
    </p>
    ${
      options.reason
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;margin:0 0 20px;">
             <p style="margin:0;font-size:14px;color:#b91c1c;">${options.reason}</p>
           </div>`
        : ""
    }
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Please make sure your bank account details are up to date in your profile. Our team has been notified and will follow up shortly.
    </p>
    ${btn(`${APP_URL}/influencer/profile`, "Review Payment Details")}
  `);
}

