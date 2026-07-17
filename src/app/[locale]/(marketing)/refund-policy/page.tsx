import { Link } from "@/i18n/navigation";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-bg px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">
          ← Scop
        </Link>
        <h1 className="font-display mt-6 text-3xl font-medium">Refund Policy</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated: 2026</p>
        <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
          <p>
            Scop offers a 14-day free trial. You will not be charged until the
            trial period ends, provided you cancel before billing begins.
          </p>
          <p>
            After a paid subscription starts, fees are charged per branch per
            month. Refund requests are reviewed on a case-by-case basis —
            contact us and we will do our best to help.
          </p>
          <p>
            Reach out via{" "}
            <a
              href="https://wa.me/966551553245"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              WhatsApp
            </a>{" "}
            or{" "}
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
