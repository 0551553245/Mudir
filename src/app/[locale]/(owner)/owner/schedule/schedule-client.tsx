"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createScheduleEvent } from "@/lib/actions/owner";
import { Button, Input, Select, Textarea, Modal, PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import type { Branch, ScheduleEvent } from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";

interface ScheduleClientProps {
  events: ScheduleEvent[];
  branches: Branch[];
  restaurantId: string;
}

export function ScheduleClient({
  events,
  branches,
  restaurantId,
}: ScheduleClientProps) {
  const t = useTranslations("owner");
  const te = useTranslations("eventTypes");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("restaurant_id", restaurantId);
    const result = await createScheduleEvent(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  function eventTitle(e: ScheduleEvent) {
    return locale === "ar" && e.title_ar ? e.title_ar : e.title;
  }

  return (
    <div>
      <PageHeader
        title={t("scheduleTitle")}
        subtitle={t("scheduleSubtitle")}
        action={<Button onClick={() => setOpen(true)}>{t("addEvent")}</Button>}
      />

      <PanelBlock title={t("scheduleTitle")} role="owner">
        {events.length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          events.map((ev) => (
            <FeatureRow
              key={ev.id}
              title={eventTitle(ev)}
              description={`${te(ev.type)} · ${format(new Date(ev.event_date), "PP")} · ${ev.branch_id ? branches.find((b) => b.id === ev.branch_id)?.name : tc("allBranches")}`}
            />
          ))
        )}
      </PanelBlock>

      <Modal open={open} onClose={() => setOpen(false)} title={t("addEvent")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="title" label={t("eventTitle")} required />
          <Input name="title_ar" label={`${t("eventTitle")} (AR)`} />
          <Select
            name="type"
            label={t("eventType")}
            options={[
              { value: "training", label: te("training") },
              { value: "inspection", label: te("inspection") },
              { value: "audit", label: te("audit") },
              { value: "other", label: te("other") },
            ]}
          />
          <Input name="event_date" type="date" label={t("eventDate")} required />
          <Select
            name="branch_id"
            label={tc("branch")}
            options={[
              { value: "", label: tc("allBranches") },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          <Textarea name="description" label={tc("optional")} />
          {error && <p className="text-sm text-needs-attention">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>{tc("create")}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
