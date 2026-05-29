import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{t("appName")}</h1>
        <p className="text-muted-foreground text-lg">{t("welcome")}</p>
      </div>
    </main>
  );
}
