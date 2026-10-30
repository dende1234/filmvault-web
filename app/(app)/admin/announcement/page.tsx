import { AdminAnnouncementClient } from "@/components/admin/admin-announcement-client";
import { getAnnouncements } from "@/actions/announcements";
import { requireAdmin } from "@/lib/require-admin";

export default async function AdminAnnouncementPage() {
  await requireAdmin();
  const history = await getAnnouncements();
  return (
    <div className="mx-auto max-w-lg">
      <AdminAnnouncementClient history={history} />
    </div>
  );
}
