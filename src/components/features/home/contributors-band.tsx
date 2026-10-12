import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CONTRIBUTORS } from "@/config/contributors";

/** "Built by Nurix Hive" strip: overlapping portraits and a link to the Contributors page. */
export function ContributorsBand() {
  return (
    <section aria-labelledby="team-title" className="container-app reveal mt-24">
      <div className="relative isolate flex flex-col items-center gap-6 overflow-hidden rounded-[2rem] border border-border bg-surface p-8 text-center shadow-sm sm:flex-row sm:justify-between sm:p-10 sm:text-left">
        <div aria-hidden className="absolute -left-20 -top-20 -z-10 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <ul className="flex -space-x-4" aria-label="Contributors">
            {CONTRIBUTORS.map((person) => (
              <li key={person.id}>
                <Image src={person.photo} alt={person.photoAlt} width={72} height={72} className="size-16 rounded-full border-[3px] border-surface object-cover shadow-md transition hover:-translate-y-1 sm:size-[4.5rem]" />
              </li>
            ))}
          </ul>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">The team</p>
            <h2 id="team-title" className="mt-1 font-display text-2xl font-bold tracking-tight">
              Built by Nurix Hive
            </h2>
            <p className="mt-1 max-w-xl text-fg-muted">Meet the students and engineers who designed and shipped CampusOS for City University.</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="lg">
          <Link href="/contributors">
            Meet the team <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
