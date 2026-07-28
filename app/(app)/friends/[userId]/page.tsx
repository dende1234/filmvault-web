import Link from "next/link";
import { getPublicProfiles } from "@/actions/friends";
import { getCollectionsForUser } from "@/actions/collections";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function FriendCollectionsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const dict = getDictionary(await getLocale());

  const [profiles, collections] = await Promise.all([getPublicProfiles([userId]), getCollectionsForUser(userId)]);
  const friendName = profiles[0]?.name || dict.friend_collections_default_name;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">{format(dict.friend_collections_title, friendName)}</h1>

      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.friend_collections_empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={`/friends/${userId}/${c.id}`}>
              <Card className="h-full hover:bg-muted">
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                </CardHeader>
                {c.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
