import {
  getGoogleChatNotificationSettings,
} from "@/lib/notifications/google-chat-settings";
import { type GoogleChatNotificationEvent } from "@/lib/notifications/google-chat-settings-shared";

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

async function shouldSend(event: GoogleChatNotificationEvent) {
  if (!WEBHOOK_URL) {
    console.warn("[Google Chat] GOOGLE_CHAT_WEBHOOK_URL not set - skipping notification");
    return false;
  }

  const settings = await getGoogleChatNotificationSettings();
  return settings[event] ?? true;
}

async function sendChatCard(card: Card) {
  if (!WEBHOOK_URL) return;

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
  } catch (error) {
    console.error("[Google Chat] Error sending notification:", error);
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
  } catch (error) {
    console.error("[Google Chat] Error sending text notification:", error);
  }
}

export const googleChat = {
  influencerJoined: async (name: string, tier: string, platforms: string[]) => {
    if (!(await shouldSend("influencer_joined"))) return;

    return sendChatCard({
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
    });
  },

  assetSubmitted: async (influencerName: string, campaignTitle: string, platform: string) => {
    if (!(await shouldSend("asset_submitted"))) return;

    return sendChatCard({
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
                text: "Review the asset in the Admin Portal -> Assets section.",
              },
            },
          ],
        },
      ],
    });
  },

  paymentProcessed: async (influencerName: string, amount: string, currency: string) => {
    if (!(await shouldSend("payment_processed"))) return;

    return sendText(
      `[PAID] Payment sent: ${currency.toUpperCase()} ${amount} to ${influencerName} via Stripe`
    );
  },

  paymentFailed: async (influencerName: string, amount: string, reason?: string) => {
    if (!(await shouldSend("payment_failed"))) return;

    return sendText(
      `[FAILED] Payout failed: ${amount} to ${influencerName}${reason ? ` - ${reason}` : ""}. Check Stripe.`
    );
  },

  shipmentReminder: async (influencerName: string, campaignTitle: string, daysOverdue: number) => {
    if (!(await shouldSend("shipment_reminder"))) return;

    return sendText(
      `[SHIPMENT] Product for ${influencerName} (${campaignTitle}) has not been shipped - ${
        daysOverdue > 0 ? `${daysOverdue} days overdue` : "due soon"
      }.`
    );
  },

  campaignMilestone: async (campaignTitle: string, milestone: string) => {
    if (!(await shouldSend("campaign_milestone"))) return;
    return sendText(`[MILESTONE] "${campaignTitle}" - ${milestone}`);
  },

  campaignSignupRequested: async (campaignTitle: string, influencerName: string) => {
    if (!(await shouldSend("campaign_signup_requested"))) return;
    return sendText(`[SIGNUP] ${influencerName} joined "${campaignTitle}" (pending approval).`);
  },

  campaignEnrollmentDecision: async (
    campaignTitle: string,
    influencerName: string,
    decision: "accepted" | "declined"
  ) => {
    const event =
      decision === "accepted"
        ? "campaign_enrollment_accepted"
        : "campaign_enrollment_declined";
    if (!(await shouldSend(event))) return;

    return sendText(
      `[ENROLLMENT ${decision.toUpperCase()}] ${influencerName} in "${campaignTitle}".`
    );
  },
};
