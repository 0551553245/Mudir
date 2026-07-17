"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  CheckSquare,
  Thermometer,
  CalendarDays,
  BarChart3,
  Building2,
  Globe,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "en" | "ar";

const WHATSAPP_URL = "https://wa.me/966551553245";

const features = [
  {
    Icon: CheckSquare,
    bg: "bg-[#EAF4F2]",
    color: "text-[#1F5C54]",
    title: { en: "Custom checklists", ar: "قوائم مخصصة" },
    desc: {
      en: "Build daily, weekly, or monthly checklists — with photo, note, or number proof required per item.",
      ar: "أنشئ قوائم يومية أو أسبوعية أو شهرية — مع إثبات صورة أو ملاحظة أو رقم لكل عنصر.",
    },
  },
  {
    Icon: Thermometer,
    bg: "bg-[#FFF3E6]",
    color: "text-[#A85A1E]",
    title: { en: "Food-safety standards", ar: "معايير سلامة الغذاء" },
    desc: {
      en: "Set safe ranges once. Pass/fail is calculated automatically from what managers enter.",
      ar: "حدد النطاقات الآمنة مرة واحدة. يُحسب النجاح/الرسوب تلقائيًا مما يدخله المدراء.",
    },
  },
  {
    Icon: CalendarDays,
    bg: "bg-[#E7EDEF]",
    color: "text-[#17323A]",
    title: { en: "Scheduling", ar: "الجدولة" },
    desc: {
      en: "Plan training, inspections and audits across one branch or every branch at once.",
      ar: "خطط للتدريب والتفتيش والتدقيق لفرع واحد أو لكل الفروع دفعة واحدة.",
    },
  },
  {
    Icon: BarChart3,
    bg: "bg-[#EAF4F2]",
    color: "text-[#1F5C54]",
    title: { en: "Real-time reporting", ar: "تقارير لحظية" },
    desc: {
      en: "Completion and pass rates roll up live — no waiting for a manager’s end-of-day message.",
      ar: "تتراكم معدلات الإنجاز والنجاح لحظيًا — دون انتظار رسالة نهاية اليوم من المدير.",
    },
  },
  {
    Icon: Building2,
    bg: "bg-[#FBEAE4]",
    color: "text-[#9C3F26]",
    title: { en: "Multi-branch by design", ar: "متعدد الفروع بالتصميم" },
    desc: {
      en: "Every branch has its own manager logins, data, and view — fully isolated, fully yours.",
      ar: "لكل فرع تسجيل دخول مدير مستقل وبياناته وعرضه الخاص — معزول بالكامل وملكك أنت.",
    },
  },
  {
    Icon: Globe,
    bg: "bg-[#FFF3E6]",
    color: "text-[#A85A1E]",
    title: { en: "Fully bilingual", ar: "ثنائي اللغة بالكامل" },
    desc: {
      en: "Arabic and English with true right-to-left layout — not a translated afterthought.",
      ar: "عربي وإنجليزي مع تخطيط من اليمين لليسار حقيقي — وليس ترجمة لاحقة.",
    },
  },
];

const faqs = [
  {
    q: {
      en: "Do I need a credit card to start the trial?",
      ar: "هل أحتاج بطاقة ائتمان لبدء التجربة؟",
    },
    a: {
      en: "No — every new owner account gets 14 days free with no card required.",
      ar: "لا — يحصل كل حساب مالك جديد على 14 يومًا مجانًا دون الحاجة لبطاقة.",
    },
  },
  {
    q: {
      en: "How does pricing work with multiple branches?",
      ar: "كيف يعمل التسعير مع فروع متعددة؟",
    },
    a: {
      en: "It’s 50 SAR per branch per month, with 2 managers included per branch at no extra cost.",
      ar: "50 ريالًا سعوديًا لكل فرع شهريًا، مع مديرين لكل فرع دون تكلفة إضافية.",
    },
  },
  {
    q: {
      en: "What happens if I have 10 or more branches?",
      ar: "ماذا لو كان لدي 10 فروع أو أكثر؟",
    },
    a: {
      en: "We don’t auto-bill past that point — you’ll get custom enterprise pricing through our sales team.",
      ar: "لا نقوم بالفوترة التلقائية بعد هذا الحد — ستحصل على تسعير مؤسسات مخصص عبر فريق المبيعات.",
    },
  },
  {
    q: {
      en: "Can each branch manager only see their own branch?",
      ar: "هل يرى كل مدير فرع فرعه فقط؟",
    },
    a: {
      en: "Yes — data isolation is enforced at the database level, not just in the interface.",
      ar: "نعم — يتم فرض عزل البيانات على مستوى قاعدة البيانات، وليس فقط في الواجهة.",
    },
  },
  {
    q: {
      en: "Is Scop available in Arabic?",
      ar: "هل سكوب متاح بالعربية؟",
    },
    a: {
      en: "Yes, fully — with true right-to-left layout across every screen, not just translated text.",
      ar: "نعم بالكامل — مع تخطيط حقيقي من اليمين لليسار في كل شاشة، وليس مجرد نص مترجم.",
    },
  },
];

const copy = {
  en: {
    appName: "Scop",
    navFeatures: "Features",
    navPricing: "Pricing",
    navFaq: "FAQ",
    navLogin: "Log in",
    navTrial: "Start free trial",
    heroKicker: "For multi-branch restaurants",
    heroTitle: "Manage every branch like it’s your only one.",
    heroSub:
      "Scop replaces scattered WhatsApp checklists with live task tracking, food-safety logs, and scheduling — across every branch, in real time.",
    heroCtaPrimary: "Start 14-day free trial",
    heroCtaSecondary: "See how it works",
    heroNote: "No card required · Cancel anytime",
    mockTitle: "Owner dashboard",
    mockLive: "Live",
    mockDone: "Done",
    mockPending: "Pending",
    mockMissed: "Missed",
    mockBranches: [
      { name: "Olaya — Riyadh", pct: 92 },
      { name: "Corniche — Jeddah", pct: 78 },
      { name: "Dammam", pct: 88 },
    ],
    trustStats: [
      { value: "128+", label: "Restaurants onboard" },
      { value: "600+", label: "Branches managed" },
      { value: "99.2%", label: "Uptime" },
      { value: "14", label: "Day free trial" },
    ],
    featuresKicker: "Everything, in one place",
    featuresTitle: "Built for how restaurants actually run",
    pricingKicker: "Simple pricing",
    pricingTitle: "One price, every branch",
    pricingSub: "No setup fees. No hidden tiers.",
    pricingPer: "per branch / month",
    pricingNote: "Includes 2 managers per branch at no extra cost.",
    pricingFeatures: [
      "2 managers per branch included",
      "Unlimited checklists",
      "Automatic food-safety logs",
      "Real-time dashboards",
      "Full Arabic & English support",
    ],
    pricingEnterprise: "10+ branches? Get custom enterprise pricing.",
    faqKicker: "Questions",
    faqTitle: "Frequently asked",
    ctaTitle: "Ready to see it running your branches?",
    ctaSub: "Start your 14-day free trial — no card required.",
    footerCopy: "© 2026 Scop. Made for restaurants in Saudi Arabia.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    refund: "Refund Policy",
    adminLogin: "Admin login",
  },
  ar: {
    appName: "سكوب",
    navFeatures: "المزايا",
    navPricing: "الأسعار",
    navFaq: "الأسئلة الشائعة",
    navLogin: "تسجيل الدخول",
    navTrial: "ابدأ تجربة مجانية",
    heroKicker: "لمطاعم متعددة الفروع",
    heroTitle: "أدر كل فرع وكأنه الفرع الوحيد لديك.",
    heroSub:
      "يستبدل سكوب قوائم واتساب المبعثرة بمتابعة مهام مباشرة، وسجلات سلامة غذاء، وجدولة — عبر كل فرع، لحظة بلحظة.",
    heroCtaPrimary: "ابدأ تجربة مجانية 14 يومًا",
    heroCtaSecondary: "شاهد كيف يعمل",
    heroNote: "بدون بطاقة ائتمان · ألغِ في أي وقت",
    mockTitle: "لوحة تحكم المالك",
    mockLive: "مباشر",
    mockDone: "منجز",
    mockPending: "قيد الانتظار",
    mockMissed: "فائت",
    mockBranches: [
      { name: "العليا — الرياض", pct: 92 },
      { name: "الكورنيش — جدة", pct: 78 },
      { name: "الدمام", pct: 88 },
    ],
    trustStats: [
      { value: "128+", label: "مطعم على المنصة" },
      { value: "600+", label: "فرع مُدار" },
      { value: "99.2%", label: "وقت تشغيل" },
      { value: "14", label: "يومًا تجربة مجانية" },
    ],
    featuresKicker: "كل شيء في مكان واحد",
    featuresTitle: "مصمم لطريقة عمل المطاعم فعليًا",
    pricingKicker: "أسعار بسيطة",
    pricingTitle: "سعر واحد، لكل فرع",
    pricingSub: "بدون رسوم إعداد. بدون فئات مخفية.",
    pricingPer: "لكل فرع / شهريًا",
    pricingNote: "يشمل مديرين لكل فرع دون تكلفة إضافية.",
    pricingFeatures: [
      "مديران لكل فرع مشمولان",
      "قوائم مهام غير محدودة",
      "سجلات سلامة غذاء تلقائية",
      "لوحات تحكم مباشرة",
      "دعم عربي وإنجليزي كامل",
    ],
    pricingEnterprise: "10+ فروع؟ احصل على تسعير مؤسسات مخصص.",
    faqKicker: "أسئلة",
    faqTitle: "الأسئلة الشائعة",
    ctaTitle: "جاهز لتراه يدير فروعك؟",
    ctaSub: "ابدأ تجربتك المجانية لمدة 14 يومًا — بدون بطاقة ائتمان.",
    footerCopy: "© 2026 سكوب. صُنع لمطاعم المملكة العربية السعودية.",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    refund: "سياسة الاسترداد",
    adminLogin: "تسجيل دخول الإدارة",
  },
} as const;

export default function Landing({ initialLang = "en" }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const t = copy[lang];
  const rtl = lang === "ar";

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={lang}
      className={cn(
        "min-h-screen overflow-x-hidden bg-bg text-ink",
        rtl
          ? "font-[family-name:var(--font-cairo)]"
          : "font-[family-name:var(--font-inter)]"
      )}
    >
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-deep-palm font-[family-name:var(--font-outfit)] text-[17px] font-bold text-white">
            S
          </span>
          <span className="font-[family-name:var(--font-outfit)] text-xl font-bold text-deep-palm">
            {t.appName}
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <button
            type="button"
            onClick={() => scrollTo("features")}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-deep-palm"
          >
            {t.navFeatures}
          </button>
          <button
            type="button"
            onClick={() => scrollTo("pricing")}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-deep-palm"
          >
            {t.navPricing}
          </button>
          <button
            type="button"
            onClick={() => scrollTo("faq")}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-deep-palm"
          >
            {t.navFaq}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 rounded-[10px] border border-border bg-card p-[3px] font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "rounded-[7px] px-2.5 py-1 transition-colors",
                lang === "en"
                  ? "bg-deep-palm text-white"
                  : "bg-transparent text-ink-soft"
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={cn(
                "rounded-[7px] px-2.5 py-1 transition-colors",
                lang === "ar"
                  ? "bg-deep-palm text-white"
                  : "bg-transparent text-ink-soft"
              )}
            >
              AR
            </button>
          </div>
          <Link
            href="/login"
            className="hidden text-[13.5px] font-semibold text-ink sm:inline"
          >
            {t.navLogin}
          </Link>
          <Link
            href="/signup"
            className="btn-primary whitespace-nowrap px-[18px] py-2.5 text-[13.5px]"
          >
            {t.navTrial}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex max-w-[1280px] flex-col items-center gap-12 overflow-hidden px-5 py-8 md:flex-row md:gap-12 md:px-10 md:py-[60px]">
        <div className="pointer-events-none absolute -top-[60px] end-[-60px] h-[220px] w-[220px] animate-lp-float rounded-full bg-[radial-gradient(circle,#9ED0C755,transparent_70%)]" />
        <div className="pointer-events-none absolute bottom-[-40px] start-[10%] h-40 w-40 animate-lp-float-2 rounded-full bg-[radial-gradient(circle,#F9AD6A33,transparent_70%)]" />

        <div className="relative z-10 min-w-0 flex-1 animate-lp-fade">
          <span className="inline-block rounded-full bg-gold-muted px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-[11.5px] font-bold uppercase tracking-wide text-[#A85A1E]">
            {t.heroKicker}
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-outfit)] text-[34px] font-bold leading-[1.08] tracking-tight text-deep-palm md:text-[52px]">
            {t.heroTitle}
          </h1>
          <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ink-soft">
            {t.heroSub}
          </p>
          <div className="mt-7 flex flex-wrap gap-3.5">
            <Link
              href="/signup"
              className="btn-primary px-[26px] py-[15px] text-[15px]"
            >
              {t.heroCtaPrimary}
            </Link>
            <button
              type="button"
              onClick={() => scrollTo("features")}
              className="rounded-xl border-[1.5px] border-border bg-transparent px-[26px] py-[15px] text-[15px] font-semibold text-deep-palm transition-colors hover:border-accent hover:bg-card"
            >
              {t.heroCtaSecondary}
            </button>
          </div>
          <div className="mt-[22px] flex items-center gap-2">
            <Check className="h-4 w-4 text-accent" strokeWidth={2.5} />
            <span className="text-[13px] text-ink-faint">{t.heroNote}</span>
          </div>
        </div>

        <div className="relative z-10 w-full min-w-0 flex-1 animate-lp-fade">
          <div className="rounded-[22px] border border-border bg-card p-[22px] shadow-[0_30px_70px_rgba(15,45,32,0.12)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-[family-name:var(--font-outfit)] text-[15px] font-semibold text-deep-palm">
                {t.mockTitle}
              </span>
              <div className="flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1">
                <span className="h-[7px] w-[7px] animate-lp-pulse rounded-full bg-accent" />
                <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-semibold uppercase text-accent">
                  {t.mockLive}
                </span>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-[14px] border-t-[3px] border-t-accent bg-bg p-3.5">
                <div className="font-[family-name:var(--font-ibm-plex-mono)] text-[9.5px] uppercase text-ink-faint">
                  {t.mockDone}
                </div>
                <div className="mt-1 font-[family-name:var(--font-outfit)] text-[22px] font-semibold text-deep-palm">
                  26
                </div>
              </div>
              <div className="rounded-[14px] border-t-[3px] border-t-gold bg-bg p-3.5">
                <div className="font-[family-name:var(--font-ibm-plex-mono)] text-[9.5px] uppercase text-ink-faint">
                  {t.mockPending}
                </div>
                <div className="mt-1 font-[family-name:var(--font-outfit)] text-[22px] font-semibold text-[#A85A1E]">
                  6
                </div>
              </div>
              <div className="rounded-[14px] border-t-[3px] border-t-[#D46C4E] bg-bg p-3.5">
                <div className="font-[family-name:var(--font-ibm-plex-mono)] text-[9.5px] uppercase text-ink-faint">
                  {t.mockMissed}
                </div>
                <div className="mt-1 font-[family-name:var(--font-outfit)] text-[22px] font-semibold text-[#9C3F26]">
                  3
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {t.mockBranches.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between rounded-lg border-b border-border px-1 py-2.5 transition-colors hover:bg-bg"
                >
                  <span className="text-[13px] font-semibold text-ink">
                    {b.name}
                  </span>
                  <span
                    className={cn(
                      "font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-bold",
                      b.pct >= 85 ? "text-[#1F5C54]" : "text-[#A85A1E]"
                    )}
                  >
                    {b.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="mx-auto max-w-[1280px] px-5 pb-[60px] md:px-10">
        <div className="grid grid-cols-2 gap-5 border-y border-border py-8 md:grid-cols-4">
          {t.trustStats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-[family-name:var(--font-outfit)] text-[30px] font-bold text-deep-palm">
                {s.value}
              </div>
              <div className="mt-1 text-[13px] text-ink-faint">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-[1280px] scroll-mt-24 px-5 pb-20 pt-5 md:px-10"
      >
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <span className="font-mono-label text-accent">{t.featuresKicker}</span>
          <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-[26px] font-semibold text-deep-palm md:text-[34px]">
            {t.featuresTitle}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title.en}
              className="rounded-[18px] border border-border bg-card p-[26px] transition-all hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,45,32,0.1)]"
            >
              <div
                className={cn(
                  "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
                  f.bg,
                  f.color
                )}
              >
                <f.Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              </div>
              <h3 className="font-[family-name:var(--font-outfit)] text-[16.5px] font-semibold text-ink">
                {f.title[lang]}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {f.desc[lang]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="scroll-mt-24 bg-deep-palm px-5 py-8 md:px-10 md:py-[60px]"
      >
        <div className="mx-auto max-w-[1280px]">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
            <span className="font-mono-label text-[#9ED0C7]">
              {t.pricingKicker}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-[26px] font-semibold text-white md:text-[34px]">
              {t.pricingTitle}
            </h2>
            <p className="mt-3 text-[15px] text-[#C7D9D5]">{t.pricingSub}</p>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-[420px] rounded-[22px] bg-white p-9 transition-transform hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
              <div className="flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-outfit)] text-[44px] font-bold text-deep-palm">
                  50 SAR
                </span>
                <span className="text-sm text-ink-faint">{t.pricingPer}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] text-ink-soft">{t.pricingNote}</p>
              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
                {t.pricingFeatures.map((pf) => (
                  <div key={pf} className="flex items-center gap-2.5">
                    <Check
                      className="h-4 w-4 shrink-0 text-accent"
                      strokeWidth={2.5}
                    />
                    <span className="text-sm text-ink">{pf}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className="btn-primary mt-[26px] w-full py-[15px] text-[15px]"
              >
                {t.heroCtaPrimary}
              </Link>
              <p className="mt-3.5 text-center text-xs text-ink-faint">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-deep-palm"
                >
                  {t.pricingEnterprise}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto max-w-[900px] scroll-mt-24 px-5 py-8 md:px-10 md:py-[60px]"
      >
        <div className="mb-10 text-center">
          <span className="font-mono-label text-accent">{t.faqKicker}</span>
          <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-[26px] font-semibold text-deep-palm md:text-[34px]">
            {t.faqTitle}
          </h2>
        </div>
        <div className="flex flex-col gap-0.5">
          {faqs.map((item, i) => {
            const open = openFaq === i;
            return (
              <button
                key={item.q.en}
                type="button"
                onClick={() => setOpenFaq(open ? null : i)}
                className="rounded-[14px] border border-border bg-card px-5 py-[18px] text-start transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span className="font-[family-name:var(--font-outfit)] text-[15px] font-semibold text-ink">
                    {item.q[lang]}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-faint transition-transform",
                      open && "rotate-180"
                    )}
                    strokeWidth={2.5}
                  />
                </div>
                {open ? (
                  <p className="mt-3 animate-lp-fade text-sm leading-relaxed text-ink-soft">
                    {item.a[lang]}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1280px] px-5 pb-[90px] md:px-10">
        <div className="rounded-3xl border border-border bg-card px-10 py-14 text-center">
          <h2 className="font-[family-name:var(--font-outfit)] text-[26px] font-semibold text-deep-palm md:text-[34px]">
            {t.ctaTitle}
          </h2>
          <p className="mt-3 text-[15px] text-ink-soft">{t.ctaSub}</p>
          <Link
            href="/signup"
            className="btn-primary mt-6 inline-flex px-[30px] py-[15px] text-[15px]"
          >
            {t.heroCtaPrimary}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-deep-palm font-[family-name:var(--font-outfit)] text-xs font-bold text-white">
              S
            </span>
            <span className="font-[family-name:var(--font-outfit)] text-sm font-semibold text-deep-palm">
              {t.appName}
            </span>
          </div>
          <span className="text-[12.5px] text-ink-faint">{t.footerCopy}</span>
          <div className="flex flex-wrap gap-4 text-xs text-ink-soft">
            <Link href="/privacy-policy" className="hover:text-deep-palm">
              {t.privacy}
            </Link>
            <Link href="/terms-of-service" className="hover:text-deep-palm">
              {t.terms}
            </Link>
            <Link href="/refund-policy" className="hover:text-deep-palm">
              {t.refund}
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-5 max-w-[1280px] text-center">
          <Link
            href="/admin/login"
            className="text-[11.5px] font-medium text-ink-faint underline-offset-2 transition-colors hover:text-deep-palm hover:underline"
          >
            {t.adminLogin}
          </Link>
        </div>
      </footer>
    </div>
  );
}
