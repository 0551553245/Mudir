"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations, useLocale } from "next-intl";
import { createBranch, deleteBranch } from "@/lib/actions/owner";
import { purchaseAdditionalBranchSlot } from "@/lib/actions/billing";
import { Button, Input, Modal, ModalActions, modalFormClassName, PageHeader, EmptyState } from "@/components/ui";
import { PanelBlock, FeatureRow } from "@/components/panel-block";
import type { Branch } from "@/lib/supabase/types";
import { PRICE_PER_BRANCH_SAR } from "@/lib/supabase/types";
import { Link, useRouter } from "@/i18n/navigation";
import { formatSAR } from "@/lib/utils";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

interface BranchesClientProps {
  branches: Branch[];
  restaurantId: string;
  canAddBranch: boolean;
  blockReason: string | null;
  paidBranchLimit: number;
  moyasarConfigured: boolean;
  publishableKey: string | null;
}

export function BranchesClient({
  branches,
  restaurantId,
  canAddBranch,
  blockReason,
  paidBranchLimit,
  moyasarConfigured,
  publishableKey,
}: BranchesClientProps) {
  const t = useTranslations("owner");
  const tb = useTranslations("billing");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  function onAddClick() {
    setError("");
    if (canAddBranch) {
      setOpen(true);
      return;
    }
    setUpgradeOpen(true);
  }

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
      if (result.billingRequired) {
        setOpen(false);
        setUpgradeOpen(true);
      }
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

  async function handleUpgradePay() {
    setUpgrading(true);
    setUpgradeMessage("");
    const result = await purchaseAdditionalBranchSlot();
    if (result.alreadyHasSlot) {
      setUpgradeOpen(false);
      setOpen(true);
      setUpgrading(false);
      router.refresh();
      return;
    }
    if (result.needsCheckout) {
      setUpgradeOpen(false);
      setCheckoutOpen(true);
      setUpgrading(false);
      return;
    }
    if (result.error) {
      setUpgradeMessage(result.error);
      setUpgrading(false);
      return;
    }
    if (result.success) {
      setUpgradeOpen(false);
      setOpen(true);
      router.refresh();
    }
    setUpgrading(false);
  }

  useEffect(() => {
    if (!checkoutOpen || !scriptReady || !formRef.current || !publishableKey) {
      return;
    }

    formRef.current.innerHTML = "";
    window.Moyasar?.init({
      element: formRef.current,
      amount: PRICE_PER_BRANCH_SAR * 100,
      currency: "SAR",
      description: `Scop — add 1 branch (+${PRICE_PER_BRANCH_SAR} SAR/mo)`,
      publishable_api_key: publishableKey,
      callback_url: `${appUrl}/api/billing/callback?locale=${locale}&intent=branch_addon`,
      supported_networks: ["visa", "mastercard", "mada"],
      methods: ["creditcard"],
      credit_card: { save_card: true },
      metadata: {
        restaurant_id: restaurantId,
        payment_type: "branch_addon",
        branches_added: "1",
      },
      on_completed: async function (payment: {
        id: string;
        source: { token?: string };
      }) {
        if (payment.source?.token) {
          await fetch("/api/billing/save-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: payment.source.token,
              payment_id: payment.id,
            }),
          });
        }
      },
    });
  }, [
    checkoutOpen,
    scriptReady,
    publishableKey,
    restaurantId,
    appUrl,
    locale,
  ]);

  return (
    <div>
      {(moyasarConfigured || checkoutOpen) && (
        <Script
          src="https://cdn.moyasar.com/moyasar.js"
          onReady={() => setScriptReady(true)}
        />
      )}

      <PageHeader
        title={t("branchesTitle")}
        subtitle={t("branchesSubtitle")}
        action={
          <Button onClick={onAddClick}>{t("addBranch")}</Button>
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("addBranch")}
        footer={
          <ModalActions
            formId="branch-form"
            loading={loading}
            onCancel={() => setOpen(false)}
            submitLabel={tc("create")}
            cancelLabel={tc("cancel")}
            error={error || undefined}
          />
        }
      >
        <form
          id="branch-form"
          onSubmit={handleCreate}
          className={modalFormClassName}
        >
          <Input name="name" label={t("branchName")} required />
          <Input name="address" label={t("branchAddress")} />
        </form>
      </Modal>

      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title={tb("branchLimitTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {tb("branchLimitBody", { count: paidBranchLimit })}
          </p>
          <p className="text-sm text-ink-faint">{tb("managersIncludedNote")}</p>
          {upgradeMessage ? (
            <p className="text-sm text-needs-attention">{upgradeMessage}</p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button onClick={handleUpgradePay} disabled={upgrading}>
              {upgrading
                ? tb("processing")
                : tb("addBranchPay", {
                    price: formatSAR(PRICE_PER_BRANCH_SAR, locale),
                  })}
            </Button>
            <Link href="/owner/billing" className="text-center text-sm font-semibold text-accent hover:underline">
              {tb("updatePlan")}
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setUpgradeOpen(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title={tb("addBranchPay", {
          price: formatSAR(PRICE_PER_BRANCH_SAR, locale),
        })}
      >
        {!moyasarConfigured || !publishableKey ? (
          <p className="text-sm text-ink-soft">{tb("moyasarNotConfigured")}</p>
        ) : (
          <>
            <link rel="stylesheet" href="https://cdn.moyasar.com/moyasar.css" />
            <div ref={formRef} className="moyasar-form" />
          </>
        )}
      </Modal>
    </div>
  );
}
