import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getAuthRole } from "@/lib/auth-user";
import { ThemeColorUpdater } from "@/components/pwa/theme-color-updater";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { PersistentNav } from "@/components/dashboard/persistent-nav";
import { OneSignalProvider } from "@/components/pwa/onesignal-provider";

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

  // Le role est deja connu cote serveur (claims du JWT, verification locale) :
  // on le passe en prop plutot que de laisser la nav refaire un appel reseau.
  const role = await getAuthRole();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeColorUpdater />
      <OfflineBanner />
      <OneSignalProvider />
      <div dir={dir} className={`min-h-dvh flex flex-col ${locale === "ar" ? "font-[family-name:var(--font-arabic)]" : "font-[family-name:var(--font-sans)]"}`}>
        {children}
        <PersistentNav initialRole={role} />
      </div>
    </NextIntlClientProvider>
  );
}
