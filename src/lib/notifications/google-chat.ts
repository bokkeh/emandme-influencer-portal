const WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;

type CardSection = {
  header?: string;
  widgets: object[];
};

type Card = {
  header?: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
  };
  sections: CardSection[];
};

async function sendChatCard(card: Card) {
  if (!WEBHOOK_URL) {
    console.warn("[Google Chat] GOOGLE_CHAT_WEBHOOK_URL not set — skipping notification");
    return;
  }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardsV2: [{ cardId: crypto.randomUUID(), card }],
      }),
    });
    if (!res.ok) {
      console.error("[Google Chat] Failed to send notification:", await res.text());
    }
  } catch (err) {
    console.error("[Google Chat] Error sending notification:", err);
  }
}

async function sendText(text: string) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[Google Chat] Error sending text notification:", err);
  }
}

export const googleChat = {
  influencerJoined: (name: string, tier: string, platforms: string[]) =>
    sendChatCard({
      header: {
        title: `New Influencer Joined: ${name}`,
        subtitle: `Tier: ${tier} | Platforms: ${platforms.join(", ")}`,
      },
      sections: [
        {
          widgets: [
            {
              textParagraph: {
                text: `<b>${name}</b> has joined the Em & Me Studio Influencer Portal. Review their profile to get started.`,
              },
            },
          ],
        },
      ],
    }),

  assetSubmitted: (influencerName: string, campaignTitle: string, platform: string) =>
    sendChatCard({
      header: {
        title: "New UGC Asset Submitted",
        subtitle: `By ${influencerName} for ${campaignTitle}`,
      },
      sections: [
        {
          widgets: [
            {
              decoratedText: {
                topLabel: "Platform",
                text: platform,
              },
            },
            {
              textParagraph: {
                text: "Review the asset in the Admin Portal → Assets section.",
              },
            },
          ],
        },
      ],
    }),

  paymentProcessed: (influencerName: string, amount: string, currency: string) =>
    sendText(
      `✅ Payment sent: ${currency.toUpperCase()} ${amount} to ${influencerName} via Stripe`
    ),

  paymentFailed: (influencerName: string, amount: string, reason?: string) =>
    sendText(
      `⚠️ Payout FAILED: ${amount} to ${influencerName}${reason ? ` — ${reason}` : ""}. Check the Stripe dashboard.`
    ),

  shipmentReminder: (influencerName: string, campaignTitle: string, daysOverdue: number) =>
    sendText(
      `📦 Shipping Reminder: Product for ${influencerName} (${campaignTitle}) has not been shipped — ${daysOverdue > 0 ? `${daysOverdue} days overdue` : "due soon"}. Please ship ASAP.`
    ),

  campaignMilestone: (campaignTitle: string, milestone: string) =>
    sendText(`🎉 Campaign milestone: "${campaignTitle}" — ${milestone}`),
};
