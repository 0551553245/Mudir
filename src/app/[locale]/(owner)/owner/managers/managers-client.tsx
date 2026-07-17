"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createManager, deleteManager } from "@/lib/actions/owner";
import { Button, Input, Select, Modal, PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import type { Branch } from "@/lib/supabase/types";
import { useRouter } from "@/i18n/navigation";
import { MAX_MANAGERS_PER_BRANCH } from "@/lib/supabase/types";

interface ManagerRow {
  id: string;
  user_id: string;
  branch_id: string;
  profiles: { full_name: string | null; email: string } | null;
  branches: { name: string } | null;
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
      <PageHeader
        title={t("managersTitle")}
        subtitle={t("managersSubtitle")}
        action={
          <Button onClick={() => setOpen(true)}>{t("addManager")}</Button>
        }
      />

      <PanelBlock title={t("managersTitle")} role="owner">
        {managers.length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          managers.map((m) => (
            <FeatureRow
              key={m.id}
              title={m.profiles?.full_name ?? m.profiles?.email ?? "—"}
              description={m.branches?.name ?? "—"}
              trailing={
                <button
                  onClick={() => handleDelete(m.id, m.user_id)}
                  className="text-xs text-needs-attention hover:underline"
                >
                  {tc("delete")}
                </button>
              }
            />
          ))
        )}
      </PanelBlock>

      <Modal open={open} onClose={() => setOpen(false)} title={t("addManager")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="full_name" label={tc("required")} required />
          <Input name="email" type="email" label="Email" required />
          <Input name="password" type="password" label="Password" required minLength={8} />
          <Select
            name="branch_id"
            label={t("assignBranch")}
            required
            options={branches
              .filter((b) => (branchManagerCounts[b.id] ?? 0) < MAX_MANAGERS_PER_BRANCH)
              .map((b) => ({
                value: b.id,
                label: `${b.name} (${branchManagerCounts[b.id] ?? 0}/${MAX_MANAGERS_PER_BRANCH})`,
              }))}
          />
          {error && <p className="text-sm text-needs-attention">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>{tc("create")}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
