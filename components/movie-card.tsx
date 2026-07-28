import Link from "next/link";
import Image from "next/image";
import { posterUrl } from "@/types/tmdb";
import type { MovieSummaryDto } from "@/types/tmdb";

export function MovieCard({ movie }: { movie: MovieSummaryDto }) {
  const poster = posterUrl(movie.poster_path);
  return (
    <Link href={`/films/${movie.id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
        {poster ? (
          <Image
            src={poster}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 15vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : null}
      </div>
      <p className="line-clamp-2 text-sm font-medium">{movie.title}</p>
    </Link>
  );
}
