"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateRestaurantSettings } from "@/lib/actions/settings";
import { Button, Input, Select, PageHeader } from "@/components/ui";
import { PanelBlock } from "@/components/panel-block";
import type { Restaurant } from "@/lib/supabase/types";

interface SettingsClientProps {
  restaurant: Restaurant;
  locale: string;
}

export function SettingsClient({ restaurant, locale }: SettingsClientProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const result = await updateRestaurantSettings(fd);
    setMessage(result.error ?? t("saved"));
    setLoading(false);
  }

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PanelBlock title={t("orgProfile")} role="owner">
          <div className="space-y-4">
            <Input
              name="name"
              label={t("restaurantName")}
              defaultValue={restaurant.name}
              required
            />
            <Input
              name="commercial_registration"
              label={t("commercialRegistration")}
              defaultValue={restaurant.commercial_registration ?? ""}
            />
            <Input
              name="vat_number"
              label={t("vatNumber")}
              defaultValue={restaurant.vat_number ?? ""}
            />
            <Select
              name="timezone"
              label={t("timezone")}
              defaultValue={restaurant.timezone ?? "Asia/Riyadh"}
              options={[
                { value: "Asia/Riyadh", label: "Asia/Riyadh" },
                { value: "Asia/Dubai", label: "Asia/Dubai" },
                { value: "UTC", label: "UTC" },
              ]}
            />
            <Select
              name="locale"
              label={t("defaultLanguage")}
              defaultValue={locale}
              options={[
                { value: "ar", label: "العربية" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
        </PanelBlock>

        <PanelBlock title={t("notifications")} role="owner">
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="notify_missed_checklist"
                defaultChecked={restaurant.notify_missed_checklist !== false}
              />
              {t("missedChecklist")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="notify_food_safety_failure"
                defaultChecked={
                  restaurant.notify_food_safety_failure !== false
                }
              />
              {t("foodSafetyFailure")}
            </label>
          </div>
        </PanelBlock>

        {message && <p className="text-sm text-ink-soft">{message}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? tc("loading") : tc("save")}
        </Button>
      </form>
    </div>
  );
}
