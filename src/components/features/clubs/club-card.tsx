import { Users } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/features/follow/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CLUB_CATEGORY, labelOf } from "@/lib/labels";

export interface ClubCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  category: string;
  memberCount: number;
}

/** Club directory tile with a follow action. */
export function ClubCard({ club }: { club: ClubCardData }) {
  const category = labelOf(CLUB_CATEGORY, club.category);
  return (
    <article className="group relative flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xs transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
      <div className="flex items-start gap-4">
        <Avatar name={club.name} src={club.logoUrl} size="lg" />
        <div className="min-w-0">
          <Badge tone={category.tone}>{category.label}</Badge>
          <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug tracking-tight">
            <Link href={`/clubs/${club.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
              {club.name}
            </Link>
          </h3>
        </div>
      </div>
      <p className="line-clamp-3 text-sm text-fg-muted">{club.description}</p>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-fg-subtle">
          <Users className="size-4" aria-hidden /> {club.memberCount.toLocaleString("en-US")} followers
        </span>
        <div className="relative z-10">
          <FollowButton targetType="CLUB" targetId={club.id} name={club.name} />
        </div>
      </div>
    </article>
  );
}
