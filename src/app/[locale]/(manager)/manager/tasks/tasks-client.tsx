"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { submitTaskCompletion, uploadProofWithRetry } from "@/lib/actions/manager";
import { Button, Input, Textarea, PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import { StatusBadge } from "@/components/status-badge";
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
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const itemStats = (() => {
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
  })();

  async function handleSubmit(item: TaskItem, task: TaskWithItems) {
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
      <PageHeader
        title={t("tasksTitle")}
        subtitle={t("progress", {
          done: itemStats.done,
          total: itemStats.total,
        })}
      />
      {uploadError && (
        <p className="mb-3 text-sm text-needs-attention">{uploadError}</p>
      )}

      {itemStats.total > 0 && itemStats.done === itemStats.total ? (
        <EmptyState message={t("allCaughtUp")} />
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState message={tc("noResults")} />
      ) : (
        tasks.map((task) => (
          <PanelBlock
            key={task.id}
            title={locale === "ar" && task.title_ar ? task.title_ar : task.title}
            role="manager"
            className="mb-6"
          >
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
                locale === "ar" && item.label_ar ? item.label_ar : item.label;
              const isDone = status === "completed";

              return (
                <div key={item.id} className="feature-row flex-col items-stretch gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="feature-dot" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{label}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-faint">
                        {item.requires_photo && <span>{t("uploadPhoto")}</span>}
                        {item.requires_note && <span>{t("addNote")}</span>}
                        {item.requires_number && <span>{t("enterValue")}</span>}
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {!isDone && (
                    <div className="space-y-2 sm:w-64">
                      {item.requires_note && (
                        <Textarea
                          value={notes[item.id] ?? ""}
                          onChange={(e) =>
                            setNotes({ ...notes, [item.id]: e.target.value })
                          }
                          placeholder={t("addNote")}
                        />
                      )}
                      {item.requires_number && (
                        <Input
                          type="number"
                          value={numbers[item.id] ?? ""}
                          onChange={(e) =>
                            setNumbers({ ...numbers, [item.id]: e.target.value })
                          }
                          placeholder={t("enterValue")}
                        />
                      )}
                      {item.requires_photo && (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setPhotos({
                              ...photos,
                              [item.id]: e.target.files?.[0] ?? null,
                            })
                          }
                          className="text-xs"
                        />
                      )}
                      <Button
                        onClick={() => handleSubmit(item, task)}
                        disabled={loadingId === item.id}
                        className="w-full"
                      >
                        {t("submit")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </PanelBlock>
        ))
      )}
    </div>
  );
}
