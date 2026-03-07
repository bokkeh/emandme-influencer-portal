"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BENCHMARKS = [
  { tier: "Nano", followers: "1K-10K", cost: "$50-$200 per post" },
  { tier: "Micro", followers: "10K-100K", cost: "$100-$1,500 per post" },
  { tier: "Mid-tier", followers: "100K-500K", cost: "$1,500-$5,000 per post" },
  { tier: "Macro", followers: "500K+", cost: "$5,000-$25,000+ per post" },
];

export function CampaignCostBenchmarksCard() {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Cost Benchmarks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Influencer Type</th>
                <th className="py-2 pr-3 font-medium">Followers</th>
                <th className="py-2 font-medium">Average Cost</th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARKS.map((row) => (
                <tr key={row.tier} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-gray-900">{row.tier}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.followers}</td>
                  <td className="py-2 text-gray-700">{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
