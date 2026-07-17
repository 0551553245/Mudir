"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createBranch, deleteBranch } from "@/lib/actions/owner";
import { Button, Input, Modal, PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import type { Branch } from "@/lib/supabase/types";
import { Link, useRouter } from "@/i18n/navigation";

interface BranchesClientProps {
  branches: Branch[];
  restaurantId: string;
  canAddBranch: boolean;
  blockReason: string | null;
}

export function BranchesClient({ branches, restaurantId, canAddBranch, blockReason }: BranchesClientProps) {
  const t = useTranslations("owner");
  const tb = useTranslations("billing");
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
    formData.set("locale", locale);
    const result = await createBranch(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm(tc("confirm"))) return;
    await deleteBranch(id);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={t("branchesTitle")}
        subtitle={t("branchesSubtitle")}
        action={
          canAddBranch ? (
            <Button onClick={() => setOpen(true)}>{t("addBranch")}</Button>
          ) : (
            <Link href="/owner/billing">
              <Button variant="secondary">{tb("updatePlan")}</Button>
            </Link>
          )
        }
      />

      {blockReason && (
        <div className="mb-6 rounded-xl border border-amber bg-amber-bg px-4 py-3 text-sm text-amber-ink">
          {blockReason}
        </div>
      )}

      <PanelBlock title={t("branchesTitle")} role="owner">
        {branches.length === 0 ? (
          <EmptyState message={tc("noResults")} />
        ) : (
          branches.map((branch) => (
            <FeatureRow
              key={branch.id}
              title={branch.name}
              description={branch.address ?? undefined}
              trailing={
                <button
                  onClick={() => handleDelete(branch.id)}
                  className="text-xs text-needs-attention hover:underline"
                >
                  {tc("delete")}
                </button>
              }
            />
          ))
        )}
      </PanelBlock>

      <Modal open={open} onClose={() => setOpen(false)} title={t("addBranch")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="name" label={t("branchName")} required />
          <Input name="address" label={t("branchAddress")} />
          {error && <p className="text-sm text-needs-attention">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {tc("create")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
