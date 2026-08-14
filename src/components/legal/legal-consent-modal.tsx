"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LegalBody, LegalTabs, type LegalTab } from "./legal-content";
import type { Theme } from "@/lib/role-theme";

const ease = [0.23, 1, 0.32, 1] as const;

/**
 * Consentement explicite aux CGU et a la politique de confidentialite, exige
 * avant la creation d'un compte. Le compte n'est cree qu'apres un clic sur
 * "J'accepte" : fermer la feuille annule l'inscription.
 *
 * Les documents affiches sont ceux de la page /legal (composants partages), il
 * n'y a donc jamais deux versions des textes a maintenir. Les couleurs suivent
 * le profil choisi (violet prof, vert eleve, orange parent), comme le reste de
 * l'ecran d'inscription.
 */
export function LegalConsentModal({
  open,
  loading = false,
  theme,
  onAccept,
  onClose,
}: {
  open: boolean;
  loading?: boolean;
  theme: Theme;
  onAccept: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("legal");
  const [activeTab, setActiveTab] = useState<LegalTab>("terms");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30"
          onClick={loading ? undefined : onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col rounded-t-2xl bg-white px-5 pb-8 pt-5"
            style={{
              boxShadow: "0 -8px 32px -8px rgba(30,27,75,0.15)",
              maxHeight: "88dvh",
            }}
          >
            {/* En-tete : titre nettement au-dessus des titres de section du
                document (15px), pour retablir la hierarchie. */}
            <div className="shrink-0">
              <p className="text-[18px] font-extrabold leading-tight text-[#1e1b4b]">
                {t("consentTitle")}
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#1e1b4b]/45">
                {t("consentIntro")}
              </p>
            </div>

            <div className="mt-4 shrink-0">
              <LegalTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                theme={theme}
              />
            </div>

            {/* Le document vit dans son propre cadre teinte : il ne touche plus
                ni les onglets ni les boutons. `flex-1 min-h-0` remplace un
                calcul de hauteur devine, donc le texte ne peut pas deborder
                sous les boutons. */}
            <div
              className="mt-3 min-h-0 flex-1 overflow-y-auto scrollbar-hide rounded-2xl px-4 pb-5 pt-1"
              style={{ backgroundColor: theme.bgTint }}
            >
              <LegalBody activeTab={activeTab} theme={theme} />
            </div>

            <div className="shrink-0 pt-1">
              <button
                onClick={onAccept}
                disabled={loading}
                className="btn-push mt-3 w-full rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                style={
                  {
                    background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                    "--push-shadow": theme.shadow3d,
                    "--push-glow": theme.shadowGlow,
                  } as React.CSSProperties
                }
              >
                {loading ? t("consentLoading") : t("consentAccept")}
              </button>

              <button
                onClick={onClose}
                disabled={loading}
                className="btn-push mt-2 w-full rounded-xl py-3 text-[13px] font-extrabold disabled:opacity-60"
                style={
                  {
                    backgroundColor: theme.bgTint,
                    color: theme.primary,
                    "--push-shadow": `${theme.primary}33`,
                    "--push-glow": `${theme.primary}1a`,
                  } as React.CSSProperties
                }
              >
                {t("consentRefuse")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
