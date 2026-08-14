"use client";

import { createContext, useContext, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { themes, type Role, type Theme } from "@/lib/role-theme";

const CONTACT_NAME = "MESLI Fethi";
const CONTACT_CITY = "Algerie";
const CONTACT_EMAIL = "meslifethi977@gmail.com";
const LAST_UPDATED = "29/07/2026";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

/** Couleurs par defaut si aucun profil n est fourni. */
const defaultTheme: Theme = themes.prof;

/** Diffuse les couleurs du profil aux puces sans passer la prop partout. */
const ThemeContext = createContext<Theme>(defaultTheme);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="mt-5">
      <h2 className="text-[15px] font-extrabold text-[#1e1b4b]">{title}</h2>
      <div className="mt-2 text-[13px] font-semibold leading-relaxed text-[#1e1b4b]/60">
        {children}
      </div>
    </motion.div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  const theme = useContext(ThemeContext);
  return (
    <div className="flex gap-2 mt-1.5">
      <span
        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `${theme.primary}66` }}
      />
      <span>{children}</span>
    </div>
  );
}

function PrivacyPolicy() {
  const t = useTranslations("legal");
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.p variants={fadeUp} className="text-[11px] font-semibold text-[#1e1b4b]/30">
        {t("lastUpdated", { date: LAST_UPDATED })}
      </motion.p>

      <Section title={t("privacyController")}>
        <p>{t("privacyControllerText", { name: CONTACT_NAME, city: CONTACT_CITY, email: CONTACT_EMAIL })}</p>
      </Section>

      <Section title={t("privacyDataCollected")}>
        <Bullet>{t("privacyDataAccount")}</Bullet>
        <Bullet>{t("privacyDataProf")}</Bullet>
        <Bullet>{t("privacyDataStudent")}</Bullet>
        <Bullet>{t("privacyDataUsage")}</Bullet>
        <Bullet>{t("privacyDataQuiz")}</Bullet>
        <Bullet>{t("privacyDataTechnical")}</Bullet>
        <p className="mt-2">{t("privacyNoTracking")}</p>
      </Section>

      <Section title={t("privacyPurpose")}>
        <Bullet>{t("privacyPurpose1")}</Bullet>
        <Bullet>{t("privacyPurpose2")}</Bullet>
        <Bullet>{t("privacyPurpose3")}</Bullet>
        <Bullet>{t("privacyPurpose4")}</Bullet>
      </Section>

      <Section title={t("privacyLegalBasis")}>
        <p>{t("privacyLegalBasisText")}</p>
      </Section>

      <Section title={t("privacyMinors")}>
        <p>{t("privacyMinorsText")}</p>
      </Section>

      <Section title={t("privacyHosting")}>
        <Bullet>{t("privacyHostingAuth")}</Bullet>
        <Bullet>{t("privacyHostingApp")}</Bullet>
        <Bullet>{t("privacyHostingMonitoring")}</Bullet>
        <Bullet>{t("privacyHostingNotif")}</Bullet>
        <p className="mt-2">{t("privacyHostingSecurity")}</p>
      </Section>

      <Section title={t("privacySharing")}>
        <p>{t("privacySharingText")}</p>
      </Section>

      <Section title={t("privacyRetention")}>
        <p>{t("privacyRetentionText")}</p>
      </Section>

      <Section title={t("privacyRights")}>
        <p>{t("privacyRightsText")}</p>
        <Bullet>{t("privacyRightsAccess")}</Bullet>
        <Bullet>{t("privacyRightsRectify")}</Bullet>
        <Bullet>{t("privacyRightsDelete")}</Bullet>
        <Bullet>{t("privacyRightsObject")}</Bullet>
        <p className="mt-2">{t("privacyRightsContact", { email: CONTACT_EMAIL })}</p>
      </Section>

      <Section title={t("privacyTransfer")}>
        <p>{t("privacyTransferText")}</p>
      </Section>

      <Section title={t("privacyChanges")}>
        <p>{t("privacyChangesText")}</p>
      </Section>
    </motion.div>
  );
}

function TermsOfUse() {
  const t = useTranslations("legal");
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.p variants={fadeUp} className="text-[11px] font-semibold text-[#1e1b4b]/30">
        {t("lastUpdated", { date: LAST_UPDATED })}
      </motion.p>

      <Section title={t("termsObject")}>
        <p>{t("termsObjectText")}</p>
      </Section>

      <Section title={t("termsEditor")}>
        <p>{t("termsEditorText", { name: CONTACT_NAME, city: CONTACT_CITY, email: CONTACT_EMAIL })}</p>
      </Section>

      <Section title={t("termsAcceptance")}>
        <p>{t("termsAcceptanceText")}</p>
      </Section>

      <Section title={t("termsAccount")}>
        <Bullet>{t("termsAccount1")}</Bullet>
        <Bullet>{t("termsAccount2")}</Bullet>
        <Bullet>{t("termsAccount3")}</Bullet>
        <Bullet>{t("termsAccount4")}</Bullet>
      </Section>

      <Section title={t("termsService")}>
        <p>{t("termsServiceText")}</p>
        <p className="mt-2 font-bold text-[#1e1b4b]/80">{t("termsServiceIndep")}</p>
        <Bullet>{t("termsServiceStarter")}</Bullet>
        <Bullet>{t("termsServicePro")}</Bullet>
        <p className="mt-2 font-bold text-[#1e1b4b]/80">{t("termsServiceSchool")}</p>
        <Bullet>{t("termsServiceSchoolStarter")}</Bullet>
        <Bullet>{t("termsServiceSchoolPro")}</Bullet>
      </Section>

      <Section title={t("termsPricing")}>
        <Bullet>{t("termsPricing1")}</Bullet>
        <Bullet>{t("termsPricing2")}</Bullet>
        <Bullet>{t("termsPricing3")}</Bullet>
        <Bullet>{t("termsPricing4")}</Bullet>
      </Section>

      <Section title={t("termsObligations")}>
        <Bullet>{t("termsObligations1")}</Bullet>
        <Bullet>{t("termsObligations2")}</Bullet>
        <Bullet>{t("termsObligations3")}</Bullet>
        <Bullet>{t("termsObligations4")}</Bullet>
      </Section>

      <Section title={t("termsStudentData")}>
        <p>{t("termsStudentDataText")}</p>
      </Section>

      <Section title={t("termsIP")}>
        <p>{t("termsIPText")}</p>
      </Section>

      <Section title={t("termsAvailability")}>
        <p>{t("termsAvailabilityText")}</p>
      </Section>

      <Section title={t("termsLiability")}>
        <Bullet>{t("termsLiability1")}</Bullet>
        <Bullet>{t("termsLiability2")}</Bullet>
        <Bullet>{t("termsLiability3")}</Bullet>
      </Section>

      <Section title={t("termsSuspension")}>
        <p>{t("termsSuspensionText")}</p>
      </Section>

      <Section title={t("termsDeletion")}>
        <p>{t("termsDeletionText")}</p>
      </Section>

      <Section title={t("termsLaw")}>
        <p>{t("termsLawText")}</p>
      </Section>

      <Section title={t("termsChanges")}>
        <p>{t("termsChangesText")}</p>
      </Section>
    </motion.div>
  );
}

export type LegalTab = "privacy" | "terms";

/**
 * Selecteur d'onglet, partage entre la page /legal et la modale de
 * consentement affichee a l'inscription. Meme balisage que le selecteur
 * Connexion / Inscription de l'ecran de login.
 */
export function LegalTabs({
  activeTab,
  onTabChange,
  theme = defaultTheme,
}: {
  activeTab: LegalTab;
  onTabChange: (tab: LegalTab) => void;
  theme?: Theme;
}) {
  const t = useTranslations("legal");

  return (
    <div
      className="relative grid grid-cols-2 rounded-xl p-1 text-[13px] font-extrabold transition-colors duration-300"
      style={{ backgroundColor: `${theme.primary}12` }}
    >
      {(["privacy", "terms"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="relative z-10 rounded-lg py-2.5 transition-colors duration-200"
          style={{ color: activeTab === tab ? "#ffffff" : theme.primary }}
        >
          {tab === "privacy" ? t("tabPrivacy") : t("tabTerms")}
        </button>
      ))}
      <div
        className="absolute inset-y-1 w-[calc(50%-0.25rem)] z-0 overflow-hidden rounded-lg transition-[inset-inline-start,box-shadow] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          insetInlineStart: activeTab === "privacy" ? "0.25rem" : "calc(50%)",
          background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          boxShadow: `0 3px 0 ${theme.shadow3d}, 0 6px 12px -2px ${theme.shadowGlow}`,
        }}
      />
    </div>
  );
}

/** Corps du document selon l'onglet actif. Meme source que la page /legal. */
export function LegalBody({
  activeTab,
  theme = defaultTheme,
}: {
  activeTab: LegalTab;
  theme?: Theme;
}) {
  return (
    <ThemeContext.Provider value={theme}>
      {activeTab === "privacy" ? <PrivacyPolicy /> : <TermsOfUse />}
    </ThemeContext.Provider>
  );
}

/**
 * Page /legal. Le `role` vient soit du profil selectionne sur l'ecran de login
 * (parametre ?role=), soit du compte connecte quand on arrive depuis les
 * parametres : la page porte donc les memes couleurs que l'ecran d'ou l'on
 * vient, au lieu d'etre toujours violette.
 */
export function LegalContent({
  locale,
  role = "prof",
}: {
  locale: string;
  role?: Role;
}) {
  const t = useTranslations("legal");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LegalTab>("privacy");
  const theme = themes[role];

  return (
    <main className="flex min-h-[100dvh] flex-col" style={{ backgroundColor: theme.bgTint }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-1">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white"
          style={{ boxShadow: `0 2px 0 ${theme.inputBorder}` }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            style={{ transform: locale === "ar" ? "scaleX(-1)" : undefined }}
          >
            <path d="M15 18l-6-6 6-6" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">{t("title")}</h1>
      </div>

      {/* Tab toggle */}
      <div className="px-5 pt-4">
        <LegalTabs activeTab={activeTab} onTabChange={setActiveTab} theme={theme} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-12 scrollbar-hide">
        <LegalBody activeTab={activeTab} theme={theme} />
      </div>
    </main>
  );
}
