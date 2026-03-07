import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChecklistItem = {
  label: string;
  done: boolean;
  description?: string;
};

type Props = {
  items: ChecklistItem[];
};

export function CampaignLaunchChecklistCard({ items }: Props) {
  const completed = items.filter((item) => item.done).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Launch Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>
              {completed}/{total} complete
            </span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-rose-600 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-md border border-gray-100 px-3 py-2">
              <div className="flex items-start gap-2">
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 text-gray-400" />
                )}
                <p className={`text-sm ${item.done ? "text-gray-900" : "text-gray-600"}`}>{item.label}</p>
              </div>
              {item.description ? <p className="ml-6 mt-1 text-xs text-gray-500">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

