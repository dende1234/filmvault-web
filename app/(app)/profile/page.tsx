import { getOrCreateProfile } from "@/actions/profile";
import { getMcpTokens } from "@/actions/mcp-tokens";
import { featureOn } from "@/lib/features";
import { SITE_URL } from "@/lib/site";
import { ProfileForm } from "@/components/profile-form";
import { McpTokens } from "@/components/mcp-tokens";

export default async function ProfilePage() {
  const profile = await getOrCreateProfile();
  if (!profile) return null;
  // Connecting an AI assistant (MCP) is behind the "mcp" switch (/admin/features).
  const mcp = await featureOn("mcp");
  const tokens = mcp ? await getMcpTokens() : null;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <ProfileForm profile={profile} />
      {mcp && <McpTokens tokens={tokens} endpoint={`${SITE_URL.replace(/\/$/, "")}/api/mcp`} />}
    </div>
  );
}
