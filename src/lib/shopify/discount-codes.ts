import { shopifyGraphQL } from "./client";

type CreateDiscountParams = {
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  usageLimit?: number;
  endsAt?: string; // ISO date string
};

type CreateDiscountResult = {
  discountCodeBasicCreate: {
    codeDiscountNode: {
      id: string;
      codeDiscount: {
        codes: { nodes: Array<{ id: string; code: string }> };
      };
    };
    userErrors: Array<{ field: string[]; message: string }>;
  };
};

export async function createShopifyDiscountCode(params: CreateDiscountParams) {
  const { code, discountType, discountValue, usageLimit, endsAt } = params;

  const valueInput =
    discountType === "percentage"
      ? { percentage: discountValue / 100 }
      : { discountAmount: { amount: discountValue, appliesOnEachItem: false } };

  const query = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                nodes { id code }
              }
            }
          }
        }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    basicCodeDiscount: {
      title: code,
      code,
      startsAt: new Date().toISOString(),
      ...(endsAt ? { endsAt } : {}),
      usageLimit: usageLimit ?? null,
      customerGets: {
        value: valueInput,
        items: { all: true },
      },
      customerSelection: { all: true },
    },
  };

  const result = await shopifyGraphQL<CreateDiscountResult>(query, variables);
  const errors = result.discountCodeBasicCreate.userErrors;
  if (errors.length > 0) {
    throw new Error(`Shopify discount code errors: ${JSON.stringify(errors)}`);
  }

  const node = result.discountCodeBasicCreate.codeDiscountNode;
  const codeNode =
    (node.codeDiscount as { codes: { nodes: Array<{ id: string; code: string }> } })
      .codes.nodes[0];

  return {
    shopifyDiscountCodeId: codeNode.id,
    shopifyPriceRuleId: node.id,
    code: codeNode.code,
  };
}

export async function deactivateShopifyDiscountCode(discountNodeId: string) {
  const query = `
    mutation discountCodeDeactivate($id: ID!) {
      discountCodeDeactivate(id: $id) {
        userErrors { field message }
      }
    }
  `;
  await shopifyGraphQL(query, { id: discountNodeId });
}
