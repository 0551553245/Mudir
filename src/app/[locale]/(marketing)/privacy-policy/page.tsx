import { Link } from "@/i18n/navigation";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">
          ← Scop
        </Link>
        <h1 className="font-display mt-6 text-3xl font-medium">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: 2026</p>
        <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
          <p>
            Scop (&quot;we&quot;, &quot;us&quot;) operates the restaurant operations
            platform at scopsa.com. This page describes how we collect, use, and
            protect information when you use our service.
          </p>
          <p>
            We collect account details you provide (such as name, email, and
            restaurant information), usage data related to tasks and food safety
            logs, and billing information processed through our payment provider.
          </p>
          <p>
            We use this information to provide and improve the service, communicate
            with you, and meet legal obligations. We do not sell your personal data.
          </p>
          <p>
            For questions, contact us at{" "}
            <a href="mailto:noreply@scopsa.com" className="text-accent hover:underline">
              noreply@scopsa.com
            </a>{" "}
            or WhatsApp{" "}
            <a
              href="https://wa.me/966551553245"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              +966 551 553 245
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
