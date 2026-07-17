import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import { useTranslations } from "next-intl";

const roleStyles: Record<UserRole, string> = {
  super_admin: "tag-admin",
  owner: "tag-owner",
  manager: "tag-manager",
};

interface RoleTagProps {
  role: UserRole;
  className?: string;
}

export function RoleTag({ role, className }: RoleTagProps) {
  const t = useTranslations("roles");
  return (
    <span className={cn("tag-pill", roleStyles[role], className)}>
      {t(role)}
    </span>
  );
}
