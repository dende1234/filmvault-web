import { getAdminFeatures } from "@/actions/features";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { PageHeader } from "@/components/page-header";
import { FeaturesClient } from "@/components/admin/features-client";

export const dynamic = "force-dynamic";

/** Switch features on step by step (feature_flags.sql). */
export default async function AdminFeaturesPage() {
  const dict = getDictionary(await getLocale());
  const features = await getAdminFeatures();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={dict.features_title} description={dict.features_subtitle} />
      <FeaturesClient features={features} />
    </div>
  );
}
