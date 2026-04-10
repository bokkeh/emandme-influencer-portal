import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaviconSettingsCard } from "@/components/admin/FaviconSettingsCard";
import { BrandLogoSettingsCard } from "@/components/admin/BrandLogoSettingsCard";
import { HubSpotSyncTestCard } from "@/components/admin/HubSpotSyncTestCard";
import { GoogleChatNotificationSettingsCard } from "@/components/admin/GoogleChatNotificationSettingsCard";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage integration credentials and notifications</p>
      </div>

      <FaviconSettingsCard />
      <BrandLogoSettingsCard />
      <HubSpotSyncTestCard />

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">HubSpot CRM</CardTitle>
              <CardDescription>Sync influencer profiles as HubSpot contacts</CardDescription>
            </div>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              {process.env.HUBSPOT_PRIVATE_APP_TOKEN ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Configure your HubSpot Private App Token in <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code>{" "}
            as <code className="bg-gray-100 px-1 rounded text-xs">HUBSPOT_PRIVATE_APP_TOKEN</code>.
          </p>
          <p className="text-sm text-gray-500">
            Custom properties required in HubSpot: <code className="bg-gray-100 px-1 rounded text-xs">influencer_tier</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">influencer_niche</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">total_revenue_generated</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">total_campaigns</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">stripe_payout_status</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">portal_profile_url</code>.
          </p>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Shopify</CardTitle>
              <CardDescription>Generate discount codes and track order revenue</CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200">GraphQL Admin API</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Shop domain: <strong className="text-gray-700">{process.env.SHOPIFY_SHOP_DOMAIN ?? "Not configured"}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Configure your Shopify Admin Access Token in <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code>{" "}
            as <code className="bg-gray-100 px-1 rounded text-xs">SHOPIFY_ADMIN_ACCESS_TOKEN</code>.
          </p>
          <p className="text-sm text-gray-500">
            Webhook to configure in Shopify: <code className="bg-gray-100 px-1 rounded text-xs">{process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify</code> for <strong>orders/create</strong> events.
          </p>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Stripe Connect</CardTitle>
              <CardDescription>Send payouts directly to influencer bank accounts</CardDescription>
            </div>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">Express Accounts</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Configure Stripe credentials in <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code>.
            Influencers connect their bank via the Stripe Express onboarding flow in their profile.
          </p>
          <p className="text-sm text-gray-500">
            Stripe webhook URL: <code className="bg-gray-100 px-1 rounded text-xs">{process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe</code>
          </p>
          <p className="text-sm text-gray-500">
            Required events: <code className="bg-gray-100 px-1 rounded text-xs">account.updated</code>, <code className="bg-gray-100 px-1 rounded text-xs">transfer.created</code>, <code className="bg-gray-100 px-1 rounded text-xs">transfer.failed</code>, <code className="bg-gray-100 px-1 rounded text-xs">transfer.reversed</code>
          </p>
        </CardContent>
      </Card>

      <GoogleChatNotificationSettingsCard />

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Clerk Auth</CardTitle>
          <CardDescription>User authentication and role management</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Clerk webhook URL: <code className="bg-gray-100 px-1 rounded text-xs">{process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/clerk</code>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Required events: <code className="bg-gray-100 px-1 rounded text-xs">user.created</code>, <code className="bg-gray-100 px-1 rounded text-xs">user.updated</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
