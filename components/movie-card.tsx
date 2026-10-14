import Link from "next/link";
import { titleHref } from "@/lib/titles";
import { Star } from "lucide-react";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { Badge } from "@/components/ui/badge";

export function MovieCard({ movie, size = "md", priority }: { movie: MovieSummaryDto; size?: "sm" | "md"; priority?: boolean }) {
  const year = movie.release_date?.slice(0, 4);
  return (
    <Link href={titleHref(movie.id)} className="group flex flex-col gap-2 focus-visible:outline-none">
      <Poster path={movie.poster_path} title={movie.title} size={size} priority={priority} hover>
        {movie.vote_average > 0 && (
          <PosterCorner position="tr">
            <Badge variant="overlay" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Star className="fill-current text-primary" />
              {movie.vote_average.toFixed(1)}
            </Badge>
          </PosterCorner>
        )}
      </Poster>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">{movie.title}</p>
        {year && <p className="text-xs text-muted-foreground">{year}</p>}
      </div>
    </Link>
  );
}
