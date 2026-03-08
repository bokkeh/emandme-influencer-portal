import { TeamManagementClient } from "@/components/admin/TeamManagementClient";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500">
          Manage team access and assign admin roles.
        </p>
      </div>

      <TeamManagementClient />
    </div>
  );
}

