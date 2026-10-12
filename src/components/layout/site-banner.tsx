import { AlertTriangle, Info, Siren } from "lucide-react";
import { getSiteSettings } from "@/server/queries/settings.queries";
import { cn } from "@/lib/utils";

const TONES = {
  info: { icon: Info, className: "bg-info-soft text-info" },
  warning: { icon: AlertTriangle, className: "bg-saffron-soft text-saffron" },
  urgent: { icon: Siren, className: "bg-danger-soft text-danger" },
} as const;

/** Site-wide announcement set from Admin → Settings. Cached under the `settings` tag. */
export async function SiteBanner() {
  const { bannerMessage, bannerTone } = await getSiteSettings();
  if (!bannerMessage) return null;
  const { icon: Icon, className } = TONES[bannerTone];
  return (
    <div role="status" className={cn("border-b border-border text-sm font-medium", className)}>
      <p className="container-app flex items-center justify-center gap-2 py-2 text-center">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span>{bannerMessage}</span>
      </p>
    </div>
  );
}
