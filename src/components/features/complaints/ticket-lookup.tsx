"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ComplaintView, type TrackedComplaint } from "@/components/features/complaints/complaint-view";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { toast } from "@/lib/toast";

const schema = z.object({
  ticketNo: z.string().trim().min(1, "Enter your ticket number.").regex(/^CU-\d{4}-\d{6}$/i, "Tickets look like CU-2026-000123."),
  email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email."),
});

type Values = z.infer<typeof schema>;

/** Look up a ticket: signed-in owners see everything; otherwise ticket + email shows status only. */
export function TicketLookup() {
  const params = useSearchParams();
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { ticketNo: params.get("ticket") ?? "", email: "" } });

  const lookup = useMutation({
    mutationFn: (values: Values) => api.get<TrackedComplaint>(`/api/complaints/track/${encodeURIComponent(values.ticketNo.toUpperCase())}`, { query: { email: values.email.toLowerCase() }, notifyUnauthorized: false }),
  });

  const onSubmit = async (values: Values) => {
    if (!user && !values.email) return setError("email", { type: "validate", message: "Enter the email you filed with." });
    try {
      await lookup.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "NOT_FOUND") toast.error("No ticket matches those details. Check the number and email.");
      else toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Ticket number" error={errors.ticketNo?.message} required>
          <Input placeholder="CU-2026-000123" autoCapitalize="characters" {...register("ticketNo")} />
        </Field>
        <Field label={user ? "Email (optional)" : "Email you filed with"} error={errors.email?.message} required={!user}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
        </Field>
        <Button type="submit" size="lg" variant="gradient" loading={lookup.isPending}>
          <Search /> Track
        </Button>
      </form>
      {lookup.data && <ComplaintView complaint={lookup.data} />}
    </div>
  );
}
