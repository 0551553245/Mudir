"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createTask, updateTask, deleteTask } from "@/lib/actions/owner";
import { Button, Input, Select, Modal, ModalActions, modalFormClassName, EmptyState } from "@/components/ui";
import { PanelBlock } from "@/components/panel-block";
import { useOptionalBranchContext } from "@/components/branch-context";
import { getItemStatus } from "@/lib/tasks/period";
import { itemStatusToVocab, statusPillClass } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Branch, Task, TaskFrequency, TaskItem } from "@/lib/supabase/types";
import { TASK_CATEGORIES } from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";

interface TaskWithItems extends Task {
  task_items: TaskItem[];
}

interface TasksClientProps {
  tasks: TaskWithItems[];
  branches: Branch[];
  restaurantId: string;
  completions: Array<{
    task_item_id: string;
    branch_id: string;
    submitted_at: string;
  }>;
}

interface ItemDraft {
  label: string;
  label_ar: string;
  requires_photo: boolean;
  requires_note: boolean;
  requires_number: boolean;
}

const emptyItem = (): ItemDraft => ({
  label: "",
  label_ar: "",
  requires_photo: false,
  requires_note: false,
  requires_number: false,
});

export function TasksClient({
  tasks,
  branches,
  restaurantId,
  completions,
}: TasksClientProps) {
  const t = useTranslations("owner");
  const tf = useTranslations("frequency");
  const cat = useTranslations("categories");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const branchCtx = useOptionalBranchContext();
  const [view, setView] = useState<"list" | "grid">("list");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  const filteredTasks = useMemo(() => {
    if (!branchCtx || branchCtx.isAllBranches) return tasks;
    return tasks.filter(
      (task) =>
        !task.branch_id || task.branch_id === branchCtx.selectedBranchId
    );
  }, [tasks, branchCtx]);

  function openCreate() {
    setEditing(null);
    setItems([emptyItem()]);
    setOpen(true);
  }

  function openEdit(task: TaskWithItems) {
    setEditing(task);
    setItems(
      (task.task_items ?? []).map((i) => ({
        label: i.label,
        label_ar: i.label_ar ?? "",
        requires_photo: i.requires_photo,
        requires_note: i.requires_note,
        requires_number: i.requires_number,
      }))
    );
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("restaurant_id", restaurantId);
    formData.set("items", JSON.stringify(items.filter((i) => i.label.trim())));
    const result = editing
      ? await updateTask(
          (() => {
            formData.set("task_id", editing.id);
            return formData;
          })()
        )
      : await createTask(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setEditing(null);
    setLoading(false);
    router.refresh();
  }

  function taskTitle(task: TaskWithItems) {
    return locale === "ar" && task.title_ar ? task.title_ar : task.title;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
            {t("tasksTitle")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("tasksSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-border bg-card p-0.5">
            <button
              type="button"
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-xs font-semibold",
                view === "list"
                  ? "bg-forest text-white"
                  : "text-ink-soft hover:text-forest"
              )}
              onClick={() => setView("list")}
            >
              {t("viewList")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-xs font-semibold",
                view === "grid"
                  ? "bg-forest text-white"
                  : "text-ink-soft hover:text-forest"
              )}
              onClick={() => setView("grid")}
            >
              {t("viewByBranch")}
            </button>
          </div>
          <Button onClick={openCreate} className="!rounded-full">
            + {t("addTask")}
          </Button>
        </div>
      </div>

      {view === "list" ? (
        filteredTasks.length === 0 ? (
          <EmptyState message={t("tasksSubtitle")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filteredTasks.map((task, idx) => {
              const tones = [
                { bg: "#F0F0EE", ring: "#7A7A76" },
                { bg: "#E8F3EE", ring: "#3D8F72" },
                { bg: "#F5EFE6", ring: "#B08A4A" },
                { bg: "#F6E8E6", ring: "#C07070" },
              ];
              const tone = tones[idx % 4];
              const items = task.task_items ?? [];
              let done = 0;
              for (const item of items) {
                const last = completions.find((c) => c.task_item_id === item.id);
                const status = getItemStatus({
                  frequency: task.frequency as TaskFrequency,
                  createdAt: new Date(item.created_at),
                  lastCompletionAt: last
                    ? new Date(last.submitted_at)
                    : null,
                });
                if (status === "completed") done++;
              }
              const pct =
                items.length === 0
                  ? 0
                  : Math.round((done / items.length) * 100);
              const r = 18;
              const c = 2 * Math.PI * r;
              const dash = `${((pct / 100) * c).toFixed(1)} ${c}`;
              const branchName = task.branch_id
                ? branches.find((b) => b.id === task.branch_id)?.name
                : tc("allBranches");
              const needsPhoto = items.some((i) => i.requires_photo);
              const needsNote = items.some((i) => i.requires_note);

              return (
                <div
                  key={task.id}
                  className="flex flex-col rounded-2xl border border-border/60 p-4"
                  style={{ background: tone.bg }}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-semibold text-ink">
                        {taskTitle(task)}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-soft">
                        {branchName} · {items.length} {t("itemsShort")}
                      </p>
                    </div>
                    <div className="relative h-11 w-11 shrink-0">
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle
                          cx="22"
                          cy="22"
                          r={r}
                          fill="none"
                          stroke="rgba(22,22,22,0.08)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r={r}
                          fill="none"
                          stroke={tone.ring}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={dash}
                          transform="rotate(-90 22 22)"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
                      {tf(task.frequency)}
                    </span>
                    {needsPhoto ? (
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                        {t("tagPhoto")}
                      </span>
                    ) : null}
                    {needsNote ? (
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                        {t("tagNote")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full bg-forest"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="rounded-lg border border-border/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:text-forest"
                    >
                      {tc("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(tc("confirm"))) return;
                        await deleteTask(task.id);
                        router.refresh();
                      }}
                      className="text-[11px] text-needs-attention hover:underline"
                    >
                      {tc("delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <PanelBlock title={t("viewByBranch")} role="owner">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-start">{tc("branch")}</th>
                  {filteredTasks.map((task) => (
                    <th key={task.id} className="p-2 text-center">
                      {taskTitle(task)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2 font-medium">{b.name}</td>
                    {filteredTasks.map((task) => {
                      if (task.branch_id && task.branch_id !== b.id) {
                        return (
                          <td key={task.id} className="p-1">
                            <div className="grid-cell text-ink-faint">—</div>
                          </td>
                        );
                      }
                      const itemStatuses = (task.task_items ?? []).map((item) => {
                        const last = completions.find(
                          (c) =>
                            c.task_item_id === item.id && c.branch_id === b.id
                        );
                        return getItemStatus({
                          frequency: task.frequency as TaskFrequency,
                          createdAt: new Date(item.created_at),
                          lastCompletionAt: last
                            ? new Date(last.submitted_at)
                            : null,
                        });
                      });
                      const worst = itemStatuses.includes("missed")
                        ? "missed"
                        : itemStatuses.includes("due")
                          ? "due"
                          : itemStatuses.includes("pending")
                            ? "pending"
                            : "completed";
                      const vocab = itemStatusToVocab(worst);
                      const icons = (task.task_items ?? [])
                        .flatMap((i) => [
                          i.requires_photo ? "📷" : null,
                          i.requires_note ? "📝" : null,
                          i.requires_number ? "#" : null,
                        ])
                        .filter(Boolean)
                        .slice(0, 3)
                        .join("");
                      return (
                        <td key={task.id} className="p-1">
                          <div className={cn("grid-cell", statusPillClass(vocab))}>
                            <span>{icons || "·"}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBlock>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? t("editTask") : t("addTask")}
        footer={
          <ModalActions
            formId="checklist-form"
            loading={loading}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            submitLabel={editing ? tc("save") : tc("create")}
            cancelLabel={tc("cancel")}
            error={error || undefined}
          />
        }
      >
        <form
          id="checklist-form"
          onSubmit={handleSubmit}
          className={modalFormClassName}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Input
              name="title"
              label={t("taskTitle")}
              defaultValue={editing?.title ?? ""}
              required
            />
            <Input
              name="title_ar"
              label={`${t("taskTitle")} (AR)`}
              defaultValue={editing?.title_ar ?? ""}
            />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Select
              name="category"
              label={t("taskCategory")}
              defaultValue={editing?.category ?? "custom"}
              options={TASK_CATEGORIES.map((c) => ({
                value: c,
                label: cat(c),
              }))}
            />
            <Select
              name="frequency"
              label={t("frequency")}
              defaultValue={editing?.frequency ?? "daily"}
              options={[
                { value: "daily", label: tf("daily") },
                { value: "weekly", label: tf("weekly") },
                { value: "monthly", label: tf("monthly") },
              ]}
            />
            <Select
              name="branch_id"
              label={tc("branch")}
              defaultValue={editing?.branch_id ?? ""}
              options={[
                { value: "", label: tc("allBranches") },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="label-mono">{t("addItem")}</p>
              <Button
                type="button"
                variant="secondary"
                className="!px-2.5 !py-1 text-xs"
                onClick={() => setItems([...items, emptyItem()])}
              >
                + {t("addItem")}
              </Button>
            </div>
            <div className="max-h-[min(28vh,220px)] space-y-1.5 overflow-y-auto overscroll-contain pe-0.5">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      className="input-field !py-1.5 !px-2.5"
                      placeholder={t("itemLabel")}
                      value={item.label}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = { ...next[i], label: e.target.value };
                        setItems(next);
                      }}
                    />
                    {items.length > 1 ? (
                      <button
                        type="button"
                        className="shrink-0 px-1 text-ink-faint hover:text-needs-attention"
                        aria-label={tc("delete")}
                        onClick={() =>
                          setItems(items.filter((_, idx) => idx !== i))
                        }
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
                    {(
                      [
                        ["requires_photo", t("requiresPhoto")],
                        ["requires_note", t("requiresNote")],
                        ["requires_number", t("requiresNumber")],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={item[key]}
                          onChange={(e) => {
                            const next = [...items];
                            next[i] = {
                              ...next[i],
                              [key]: e.target.checked,
                            };
                            setItems(next);
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
