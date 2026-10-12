"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, Siren, Wrench } from "lucide-react";
import { useState } from "react";
import { AdminPage, Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { toastPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "urgent";

interface Settings {
  bannerMessage: string | null;
  bannerTone: Tone;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}

const TONE_STYLE: Record<Tone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "bg-info-soft text-info" },
  warning: { icon: AlertTriangle, className: "bg-saffron-soft text-saffron" },
  urgent: { icon: Siren, className: "bg-danger-soft text-danger" },
};

function SettingsForm({ initial }: { initial: Settings }) {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState(initial.bannerMessage ?? "");
  const [tone, setTone] = useState<Tone>(initial.bannerTone);
  const [maintenance, setMaintenance] = useState(initial.maintenanceMode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(initial.maintenanceMessage ?? "");
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await toastPromise(api.patch("/api/admin/settings", { bannerMessage: banner.trim() || null, bannerTone: tone, maintenanceMode: maintenance, maintenanceMessage: maintenanceMessage.trim() || null }), {
        loading: "Saving settings…",
        success: maintenance && !initial.maintenanceMode ? "Maintenance mode is ON for visitors (staff are unaffected). Public site updated ✓" : "Settings saved. Public site updated ✓",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch {
      // toast shown
    } finally {
      setSaving(false);
    }
  };

  const turningOn = maintenance && !initial.maintenanceMode;
  const Preview = TONE_STYLE[tone];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Panel title="Site banner" description="A one-line announcement above every public page. Clear the text to hide it.">
        <div className="space-y-4">
          <Field label="Message" hint={`${banner.length}/300`}>
            <Input value={banner} onChange={(event) => setBanner(event.target.value)} maxLength={300} placeholder="Mid-term exams start on Sunday. Good luck!" />
          </Field>
          <Field label="Style">
            <Select value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
              <option value="info">Information</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Field>
          {banner.trim() && (
            <div role="img" aria-label="Banner preview" className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", Preview.className)}>
              <Preview.icon className="size-4 shrink-0" aria-hidden /> <span>{banner}</span>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Maintenance mode" description="Visitors see a maintenance page (HTTP 503). Staff can still sign in and use the console.">
        <div className="space-y-4">
          <Switch checked={maintenance} onCheckedChange={setMaintenance} label="Maintenance mode" description="Takes effect within about 10 seconds on every server." />
          <Field label="Message shown to visitors">
            <Input value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} maxLength={300} placeholder="We are upgrading CampusOS. Back by 3 PM." />
          </Field>
          {maintenance && (
            <p className="flex items-center gap-2 rounded-xl bg-saffron-soft px-3 py-2 text-sm font-medium text-saffron">
              <Wrench className="size-4" aria-hidden /> Visitors will be blocked once you save.
            </p>
          )}
        </div>
      </Panel>
      <div className="xl:col-span-2">
        <Button onClick={() => (turningOn ? setConfirmMaintenance(true) : void save())} loading={saving}>
          Save settings
        </Button>
      </div>
      <ConfirmDialog
        open={confirmMaintenance}
        onOpenChange={setConfirmMaintenance}
        title="Turn maintenance mode on?"
        description="Every student and visitor will see the maintenance page until you turn it off. You and other staff are not affected."
        confirmLabel="Turn on"
        destructive
        onConfirm={() => {
          setConfirmMaintenance(false);
          void save();
        }}
      />
    </div>
  );
}

export function SettingsAdmin() {
  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: () => api.get<Settings>("/api/admin/settings") });
  return (
    <AdminPage title="Settings" description="Site-wide announcement and maintenance switch.">
      {settings.isPending ? <Skeleton className="h-72 rounded-2xl" /> : settings.isError ? <ErrorState error={settings.error} onRetry={() => void settings.refetch()} /> : <SettingsForm key={JSON.stringify(settings.data)} initial={settings.data} />}
    </AdminPage>
  );
}
