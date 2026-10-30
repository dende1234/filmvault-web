import { getFranchiseProgress } from "@/actions/franchises";
import { FranchisesClient } from "@/components/franchises-client";

export const metadata = { title: "Reeksen" };
// The first visit looks up every film you own at TMDB (cached a week after).
export const maxDuration = 60;

/** Film series you own part of, and which parts you're missing. */
export default async function FranchisesPage() {
  const franchises = await getFranchiseProgress();
  return (
    <div className="mx-auto max-w-6xl">
      <FranchisesClient franchises={franchises} />
    </div>
  );
}
