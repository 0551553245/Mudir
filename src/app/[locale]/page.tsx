import { redirect } from "@/i18n/navigation";
import { getProfile } from "@/lib/supabase/auth";
import { ROLE_ROUTES } from "@/lib/supabase/types";
import Landing from "@/components/landing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await getProfile();

  if (profile) {
    redirect({ href: ROLE_ROUTES[profile.role], locale });
  }

  return <Landing initialLang={locale === "ar" ? "ar" : "en"} />;
}
