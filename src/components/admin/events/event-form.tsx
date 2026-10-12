"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useClubOptions } from "@/components/admin/admin-hooks";
import { AdminPage, Panel } from "@/components/admin/kit";
import { OffDayNotice } from "@/components/admin/off-day-notice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { ImageDropzone, type UploadedImage } from "@/components/ui/file-dropzone";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { statusOfDate } from "@/config/campus-calendar";
import { useCampusClosures } from "@/hooks/use-campus-closures";
import { api, fieldErrors } from "@/lib/api-client";
import { dhakaLocalToIso, isoToDhakaLocal } from "@/lib/dhaka";
import { EVENT_TYPE, optionsOf } from "@/lib/labels";
import { toastPromise } from "@/lib/toast";

interface EventValues {
  title: string;
  description: string;
  clubId: string;
  type: string;
  startAt: string;
  endAt: string;
  venue: string;
  capacity: string;
  registrationDeadline: string;
  publish: boolean;
  confirmOffDay: boolean;
}

interface EventDetail {
  id: string;
  title: string;
  description: string;
  clubId: string;
  type: string;
  startAt: string;
  endAt: string;
  venue: string;
  bannerUrl: string | null;
  capacity: number | null;
  registrationDeadline: string | null;
  registrationCount: number;
}

const EMPTY: EventValues = { title: "", description: "", clubId: "", type: "WORKSHOP", startAt: "", endAt: "", venue: "", capacity: "", registrationDeadline: "", publish: false, confirmOffDay: false };

function EventFormFields({ event }: { event?: EventDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clubs = useClubOptions();
  const [banner, setBanner] = useState<string | null>(event?.bannerUrl ?? null);
  const editing = Boolean(event);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventValues>({
    defaultValues: event
      ? {
          ...EMPTY,
          title: event.title,
          description: event.description,
          clubId: event.clubId,
          type: event.type,
          startAt: isoToDhakaLocal(event.startAt),
          endAt: isoToDhakaLocal(event.endAt),
          venue: event.venue,
          capacity: event.capacity?.toString() ?? "",
          registrationDeadline: isoToDhakaLocal(event.registrationDeadline),
        }
      : EMPTY,
  });

  const closures = useCampusClosures();
  const startAt = useWatch({ control, name: "startAt" });
  const confirmOffDay = useWatch({ control, name: "confirmOffDay" });
  const offDay = Boolean(startAt) && !statusOfDate(startAt.slice(0, 10), closures).open;

  useEffect(() => {
    if (!editing && clubs.data?.length === 1) setValue("clubId", clubs.data[0].id);
  }, [clubs.data, editing, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (offDay && !values.confirmOffDay) {
      setError("confirmOffDay", { message: "Tick the box to confirm an event on an off day." });
      return;
    }
    const payload = {
      title: values.title,
      description: values.description,
      clubId: values.clubId,
      type: values.type,
      startAt: dhakaLocalToIso(values.startAt),
      endAt: dhakaLocalToIso(values.endAt),
      venue: values.venue,
      bannerUrl: banner,
      capacity: values.capacity ? Number(values.capacity) : null,
      registrationDeadline: values.registrationDeadline ? dhakaLocalToIso(values.registrationDeadline) : null,
      ...(offDay ? { confirmOffDay: true } : {}),
    };
    try {
      await toastPromise(editing ? api.patch(`/api/admin/events/${event?.id}`, payload) : api.post("/api/admin/events", { ...payload, publish: values.publish }), {
        loading: editing ? "Saving…" : "Creating event…",
        success: `${editing ? "Event saved." : values.publish ? "Event published." : "Draft saved."} Public site updated ✓`,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      router.push("/admin/events");
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof EventValues, { message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Panel title="Details">
        <div className="space-y-4">
          <Field label="Title" required error={errors.title?.message}>
            <Input {...register("title", { required: "Add a title." })} maxLength={200} />
          </Field>
          <Field label="Description" required error={errors.description?.message} hint="What will happen, who it is for, what to bring.">
            <Textarea {...register("description", { required: "Add a description.", minLength: { value: 10, message: "Use at least 10 characters." } })} rows={6} maxLength={10000} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Club" required error={errors.clubId?.message}>
              <Select {...register("clubId", { required: "Choose a club." })}>
                <option value="">Select a club…</option>
                {clubs.data?.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type" required error={errors.type?.message}>
              <Select {...register("type")}>
                {optionsOf(EVENT_TYPE).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Starts (Dhaka time)" required error={errors.startAt?.message}>
              <Input type="datetime-local" {...register("startAt", { required: "Pick a start time." })} />
            </Field>
            <Field label="Ends (Dhaka time)" required error={errors.endAt?.message}>
              <Input type="datetime-local" {...register("endAt", { required: "Pick an end time." })} />
            </Field>
            <Field label="Venue" required error={errors.venue?.message}>
              <Input {...register("venue", { required: "Add a venue." })} maxLength={200} />
            </Field>
            <Field label="Capacity" error={errors.capacity?.message} hint={event ? `Cannot go below ${event.registrationCount} current registrations.` : "Leave empty for no limit."}>
              <Input type="number" min={1} max={100000} inputMode="numeric" {...register("capacity")} />
            </Field>
            <Field label="Registration closes (Dhaka time)" error={errors.registrationDeadline?.message} hint="Optional. Must be before the start time.">
              <Input type="datetime-local" {...register("registrationDeadline")} />
            </Field>
          </div>
        </div>
        {offDay && <OffDayNotice dateKey={startAt.slice(0, 10)} subject="event" confirm={{ checked: confirmOffDay, onChange: (checked) => setValue("confirmOffDay", checked, { shouldValidate: true }), error: errors.confirmOffDay?.message }} />}
      </Panel>
      <div className="space-y-6">
        <Panel title="Banner" description="Compressed automatically before upload.">
          {banner ? (
            <div className="space-y-3">
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border">
                <Image src={banner} alt="Event banner preview" fill sizes="(min-width: 1280px) 30vw, 90vw" className="object-cover" />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setBanner(null)}>
                Remove banner
              </Button>
            </div>
          ) : (
            <ImageDropzone purpose="event-banner" max={1} value={[]} label="Upload banner" onChange={(images: UploadedImage[]) => setBanner(images[0]?.url ?? null)} />
          )}
        </Panel>
        <Panel title="Publish">
          {!editing && <Checkbox label="Publish immediately" description="Otherwise it is saved as a draft." {...register("publish")} />}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save changes" : "Create event"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/admin/events")}>
              Cancel
            </Button>
          </div>
        </Panel>
      </div>
    </form>
  );
}

export function EventForm({ eventId }: { eventId?: string }) {
  const detail = useQuery({ queryKey: ["admin", "event", eventId], enabled: Boolean(eventId), queryFn: () => api.get<EventDetail>(`/api/admin/events/${eventId}`) });
  return (
    <AdminPage title={eventId ? "Edit event" : "New event"} description="Times are in Asia/Dhaka. Registrants are emailed if you change the time or venue of a published event.">
      {eventId && detail.isPending ? <Skeleton className="h-96 rounded-2xl" /> : eventId && detail.isError ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : <EventFormFields event={detail.data} />}
    </AdminPage>
  );
}
