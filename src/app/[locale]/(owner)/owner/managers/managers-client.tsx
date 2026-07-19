"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createManager, deleteManager } from "@/lib/actions/owner";
import {
  Button,
  Input,
  Select,
  Modal,
  ModalActions,
  modalFormClassName,
  EmptyState,
} from "@/components/ui";
import type { Branch } from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";
import { MAX_MANAGERS_PER_BRANCH } from "@/lib/supabase/types";

interface ManagerRow {
  id: string;
  user_id: string;
  branch_id: string;
  profiles: { full_name: string | null; email: string } | null;
  branches: { name: string; address?: string | null } | null;
}

interface ManagersClientProps {
  managers: ManagerRow[];
  branches: Branch[];
  restaurantId: string;
}

export function ManagersClient({
  managers,
  branches,
  restaurantId,
}: ManagersClientProps) {
  const t = useTranslations("owner");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const branchManagerCounts = branches.reduce(
    (acc, b) => {
      acc[b.id] = managers.filter((m) => m.branch_id === b.id).length;
      return acc;
    },
    {} as Record<string, number>
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("restaurant_id", restaurantId);
    formData.set("locale", locale);
    const result = await createManager(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string, userId: string) {
    if (!confirm(tc("confirm"))) return;
    await deleteManager(id, userId);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-baloo)] text-[28px] font-bold tracking-tight text-forest">
            {t("managersTitle")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("managersSubtitle")}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="!rounded-full">
          + {t("addManager")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {managers.length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          <ul>
            {managers.map((m) => {
              const name = m.profiles?.full_name?.trim();
              const email = m.profiles?.email ?? "—";
              const invited = !name;
              const branchLabel = m.branches
                ? m.branches.address
                  ? `${m.branches.name} — ${m.branches.address}`
                  : m.branches.name
                : "—";
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0 sm:gap-4"
                >
                  <div className="min-w-[140px] flex-1">
                    <p
                      className={
                        invited
                          ? "text-sm text-ink-faint"
                          : "text-sm font-semibold text-ink"
                      }
                    >
                      {invited ? t("invitedPlaceholder") : name}
                    </p>
                  </div>
                  <p className="min-w-[120px] flex-1 text-[13px] text-ink-soft">
                    {branchLabel}
                  </p>
                  <p className="min-w-[140px] flex-[1.2] font-mono text-[12px] text-ink-faint">
                    {email}
                  </p>
                  <span
                    className={
                      invited
                        ? "rounded-full bg-[#FFF3E6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#A85A1E]"
                        : "rounded-full bg-[#E7EEF8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#3B5B8A]"
                    }
                  >
                    {invited ? t("statusInvited") : t("statusActive")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id, m.user_id)}
                    className="text-xs text-needs-attention hover:underline"
                  >
                    {tc("delete")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("addManager")}
        footer={
          <ModalActions
            formId="manager-form"
            loading={loading}
            onCancel={() => setOpen(false)}
            submitLabel={tc("create")}
            cancelLabel={tc("cancel")}
            error={error || undefined}
          />
        }
      >
        <form
          id="manager-form"
          onSubmit={handleCreate}
          className={modalFormClassName}
        >
          <Input name="full_name" label={tc("required")} required />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Input name="email" type="email" label="Email" required />
            <Input
              name="password"
              type="password"
              label="Password"
              required
              minLength={8}
            />
          </div>
          <Select
            name="branch_id"
            label={t("assignBranch")}
            required
            options={branches
              .filter(
                (b) =>
                  (branchManagerCounts[b.id] ?? 0) < MAX_MANAGERS_PER_BRANCH
              )
              .map((b) => ({
                value: b.id,
                label: `${b.name} (${branchManagerCounts[b.id] ?? 0}/${MAX_MANAGERS_PER_BRANCH})`,
              }))}
          />
        </form>
      </Modal>
    </div>
  );
}
