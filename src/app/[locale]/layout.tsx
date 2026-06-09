import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PremiumGuard } from "@/components/auth/premium-guard";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`@/i18n/messages/${locale}.json`)).default;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PremiumGuard />
      <div dir={dir} className={`min-h-dvh flex flex-col ${locale === "ar" ? "font-[family-name:var(--font-arabic)]" : "font-[family-name:var(--font-sans)]"}`}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
