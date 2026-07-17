import { Link } from "@/i18n/navigation";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-bg px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">
          ← Scop
        </Link>
        <h1 className="font-display mt-6 text-3xl font-medium">Terms of Service</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: 2026</p>
        <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
          <p>
            By creating an account or using Scop, you agree to these terms. Scop
            provides a restaurant operations platform for managing tasks, food
            safety checks, and related workflows across your branches.
          </p>
          <p>
            You are responsible for maintaining the security of your account and
            for activity that occurs under your organization. Branch manager
            accounts are created by restaurant owners and must be used only for
            their assigned branch.
          </p>
          <p>
            Subscriptions are billed per branch per month after any free trial
            ends. Enterprise pricing for larger deployments may be arranged
            separately.
          </p>
          <p>
            Questions:{" "}
            <a href="mailto:noreply@scopsa.com" className="text-accent hover:underline">
              noreply@scopsa.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
