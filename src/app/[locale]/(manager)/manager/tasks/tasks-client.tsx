"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { submitTaskCompletion, uploadProofWithRetry } from "@/lib/actions/manager";
import { Camera, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getItemStatus } from "@/lib/tasks/period";
import type { TaskFrequency, Task, TaskItem, TaskCompletion } from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";

interface TaskWithItems extends Task {
  task_items: TaskItem[];
}

interface TasksPageClientProps {
  tasks: TaskWithItems[];
  completions: TaskCompletion[];
  branchId: string;
  managerId: string;
}

export function TasksPageClient({
  tasks,
  completions,
  branchId,
  managerId,
}: TasksPageClientProps) {
  const t = useTranslations("manager");
  const tf = useTranslations("frequency");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(
    tasks[0]?.id ?? null
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const itemStats = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const task of tasks) {
      for (const item of task.task_items ?? []) {
        total++;
        const last = completions.find((c) => c.task_item_id === item.id);
        const status = getItemStatus({
          frequency: task.frequency as TaskFrequency,
          createdAt: new Date(item.created_at),
          lastCompletionAt: last ? new Date(last.submitted_at) : null,
        });
        if (status === "completed") done++;
      }
    }
    return { done, total };
  }, [tasks, completions]);

  function taskStats(task: TaskWithItems) {
    const items = task.task_items ?? [];
    let doneCount = 0;
    for (const item of items) {
      const last = completions.find((c) => c.task_item_id === item.id);
      const status = getItemStatus({
        frequency: task.frequency as TaskFrequency,
        createdAt: new Date(item.created_at),
        lastCompletionAt: last ? new Date(last.submitted_at) : null,
      });
      if (status === "completed") doneCount++;
    }
    const pct =
      items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);
    return { doneCount, totalCount: items.length, pct };
  }

  async function handleSubmit(item: TaskItem) {
    setLoadingId(item.id);
    setUploadError(null);
    let photoUrl = "";

    if (photos[item.id]) {
      const fd = new FormData();
      fd.set("photo", photos[item.id]!);
      const upload = await uploadProofWithRetry(fd);
      if ("url" in upload) {
        photoUrl = upload.url;
      } else {
        setUploadError(upload.error ?? t("uploadFailed"));
        setLoadingId(null);
        return;
      }
    }

    const formData = new FormData();
    formData.set("task_item_id", item.id);
    formData.set("branch_id", branchId);
    formData.set("manager_id", managerId);
    if (notes[item.id]) formData.set("note", notes[item.id]);
    if (numbers[item.id]) formData.set("number_value", numbers[item.id]);
    if (photoUrl) formData.set("photo_url", photoUrl);

    await submitTaskCompletion(formData);
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
          {t("tasksTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t("tasksSubtitle")}</p>
        <p className="mt-1 text-xs text-ink-faint">
          {t("progress", {
            done: itemStats.done,
            total: itemStats.total,
          })}
        </p>
      </div>

      {uploadError && (
        <p className="mb-3 text-sm text-needs-attention">{uploadError}</p>
      )}

      {itemStats.total > 0 && itemStats.done === itemStats.total ? (
        <p className="mb-4 text-sm font-semibold text-on-track">
          {t("allCaughtUp")}
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-faint">
          {tc("noResults")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const open = expanded === task.id;
            const stats = taskStats(task);
            const title =
              locale === "ar" && task.title_ar ? task.title_ar : task.title;
            const freqKey = task.frequency as "daily" | "weekly" | "monthly";

            return (
              <div
                key={task.id}
                className="overflow-hidden rounded-2xl border border-[#E8D5D0] bg-[#F6EDE9]"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : task.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-start"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-soft">
                      {tf(freqKey)} · {stats.doneCount}/{stats.totalCount}{" "}
                      {t("itemsLabel")}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold tabular-nums text-ink-soft">
                    {stats.pct}%
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-faint transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>

                {open ? (
                  <div className="space-y-2 px-3 pb-3">
                    {(task.task_items ?? []).map((item) => {
                      const lastCompletion = completions.find(
                        (c) => c.task_item_id === item.id
                      );
                      const status = getItemStatus({
                        frequency: task.frequency as TaskFrequency,
                        createdAt: new Date(item.created_at),
                        lastCompletionAt: lastCompletion
                          ? new Date(lastCompletion.submitted_at)
                          : null,
                      });
                      const label =
                        locale === "ar" && item.label_ar
                          ? item.label_ar
                          : item.label;
                      const isDone = status === "completed";
                      const needsProof =
                        item.requires_photo ||
                        item.requires_note ||
                        item.requires_number;
                      const canSubmit =
                        !item.requires_photo || !!photos[item.id];

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border/50 bg-white px-3.5 py-3"
                        >
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isDone}
                              disabled={isDone || loadingId === item.id}
                              onChange={() => {
                                if (isDone) return;
                                if (
                                  item.requires_note &&
                                  !notes[item.id]?.trim()
                                )
                                  return;
                                if (
                                  item.requires_number &&
                                  !numbers[item.id]
                                )
                                  return;
                                if (item.requires_photo && !photos[item.id])
                                  return;
                                void handleSubmit(item);
                              }}
                              className="mt-0.5 h-4 w-4 rounded border-border accent-forest"
                            />
                            <span
                              className={cn(
                                "text-[14px] font-medium text-ink",
                                isDone && "text-ink-faint line-through"
                              )}
                            >
                              {label}
                            </span>
                          </label>

                          {!isDone && needsProof ? (
                            <div className="mt-2.5 space-y-2 ps-7">
                              {item.requires_photo ? (
                                <>
                                  <input
                                    ref={(el) => {
                                      fileRefs.current[item.id] = el;
                                    }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      setPhotos({
                                        ...photos,
                                        [item.id]:
                                          e.target.files?.[0] ?? null,
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      fileRefs.current[item.id]?.click()
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[#F4F4F2] px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft hover:text-forest"
                                  >
                                    <Camera className="h-3.5 w-3.5" />
                                    {photos[item.id]
                                      ? photos[item.id]!.name.slice(0, 18)
                                      : t("addPhoto")}
                                  </button>
                                </>
                              ) : null}
                              {item.requires_note ? (
                                <input
                                  className="input-field !py-2 text-sm"
                                  value={notes[item.id] ?? ""}
                                  onChange={(e) =>
                                    setNotes({
                                      ...notes,
                                      [item.id]: e.target.value,
                                    })
                                  }
                                  placeholder={t("addNotePlaceholder")}
                                />
                              ) : null}
                              {item.requires_number ? (
                                <input
                                  type="number"
                                  className="input-field !py-2 text-sm"
                                  value={numbers[item.id] ?? ""}
                                  onChange={(e) =>
                                    setNumbers({
                                      ...numbers,
                                      [item.id]: e.target.value,
                                    })
                                  }
                                  placeholder={t("enterValue")}
                                />
                              ) : null}
                              {canSubmit ||
                              item.requires_note ||
                              item.requires_number ? (
                                <button
                                  type="button"
                                  disabled={loadingId === item.id}
                                  onClick={() => void handleSubmit(item)}
                                  className="btn-primary !px-3 !py-1.5 text-xs"
                                >
                                  {t("submit")}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
