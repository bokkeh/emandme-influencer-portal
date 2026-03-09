const BASE_URL = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

async function hubspotFetch(path: string, options: RequestInit = {}) {
  if (!TOKEN) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN not set");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${body}`);
  }
  return res.json();
}

export const hubspot = {
  getContactByEmail: (email: string) =>
    hubspotFetch(
      `/crm/v3/objects/contacts/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
          properties: ["email", "firstname", "lastname", "hs_object_id"],
        }),
      }
    ),

  createContact: (properties: Record<string, string>) =>
    hubspotFetch("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties }),
    }),

  updateContact: (contactId: string, properties: Record<string, string>) =>
    hubspotFetch(`/crm/v3/objects/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    }),
};
