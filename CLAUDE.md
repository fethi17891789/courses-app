# Courses App -- Gestion de cours de soutien (Algerie)

## Projet
Application PWA pour la gestion des cours de soutien en Algerie.
Permet aux profs de gerer leurs eleves, groupes, absences, presences et paiements.

## Stack
- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Police**: Plus Jakarta Sans (font-sans)
- **i18n**: next-intl (arabe RTL + francais, detection desactivee, defaut: fr)
- **Backend/Auth**: Supabase (PostgreSQL + Auth)
- **Hebergement**: Vercel (gratuit)
- **Notifications**: OneSignal (a integrer en V2)

## Commandes
- `npm run dev` -- serveur de developpement
- `npm run build` -- build de production
- `npm run lint` -- linter ESLint

## Structure
```
src/
  app/              # Routes Next.js (App Router)
    [locale]/       # Routes i18n (fr, ar)
  components/       # Composants reutilisables
    ui/             # Composants shadcn/ui
  lib/              # Utilitaires, config Supabase
  i18n/             # Config next-intl, messages
  types/            # Types TypeScript
docs/
  cahier-des-charges.md  # Cahier des charges complet
```

## Conventions
- Langue du code : anglais (noms de variables, fonctions, composants)
- Langue de l'UI : francais par defaut, arabe en option
- Composants : un fichier par composant dans son dossier
- Imports : utiliser l'alias `@/*` pour `src/*`
- JAMAIS d'emoji dans le code, les textes UI, les traductions, les commentaires ou les commits
- JAMAIS creer de nouveaux styles de boutons, inputs ou assets UI sauf demande explicite de l'utilisateur. Reutiliser uniquement les styles existants dans la page login (login-screen.tsx) : boutons 3D poussoirs, champs avec bordure coloree, toggles gradient, etc.
- JAMAIS inventer ou creer un nouveau design, layout ou composant visuel. Toujours respecter les assets, boutons, cartes, couleurs et patterns deja presents dans l'application. Se referer aux fichiers .md du projet (CLAUDE.md, cahier-des-charges.md) pour toute decision de design ou de fonctionnalite. Seule une demande explicite de l'utilisateur autorise une deviation.
- JAMAIS de scrollbar visible. L'app est mobile-first, l'utilisateur scroll avec ses doigts. Utiliser des classes comme `scrollbar-hide` ou `overflow-y-auto` sans barre visible.

## Design
- Style inspire de l'image de reference : fond lavande, cartes colorees sur blanc, purple en accent
- Direction artistique : cartoon sophistique, pas enfantin. Effets de dessin/illustration (traits, ombres portees solides, formes organiques) plutot que realisme ou glassmorphism. Boutons poussoirs 3D, elements vivants et expressifs.
- Palette : violet #7c3aed (principal), vert #22c55e, orange #f97316, ambre #fbbf24, rouge #ef4444
- Fond : lavande #f0ecff
- Texte : indigo fonce #1e1b4b (pas de noir pur)
- Cartes blanches avec ombres douces, coins tres arrondis (28-36px)
- Typo Plus Jakarta Sans extrabold pour les titres (Cairo pour l'arabe)
- Elements 3D decoratifs flottants avec Framer Motion
- Champs de texte : labels flottants, icones colorees, effet de profondeur 3D

## Deploiement
- PWA via Vercel (iOS + Android)
- APK via Capacitor prevu en V2

## Paiement (hors app)
- BaridiMob / virement CCP
- Code d'activation envoye manuellement apres paiement
- Systeme automatise prevu en V2

---

## Cahier des charges

### 1. Utilisateurs et roles

**Professeur (role principal)**
- Cree et gere son compte
- Configure ses matieres et niveaux
- Cree des groupes et des creneaux horaires
- Inscrit les eleves dans les groupes
- Fait l'appel (presence/absence) a chaque seance
- Suit les paiements de chaque eleve
- Consulte des statistiques

**Eleve**
- Consulte son emploi du temps
- Voit son historique de presence/absence
- Voit l'etat de ses paiements
- Recoit des notifications

**Parent**
- Lie a un ou plusieurs enfants
- Consulte la presence/absence de son enfant
- Consulte l'etat des paiements
- Recoit des notifications

### 2. Gestion des groupes

Un prof peut avoir plusieurs matieres, plusieurs niveaux, et plusieurs groupes par niveau.

Groupe :
- Nom (libre ou auto-genere)
- Matiere (ex: Maths, Physique, Francais...)
- Niveau scolaire (configurable par le prof)
- Capacite maximale
- Un ou plusieurs creneaux horaires (jour + heure debut + heure fin)
- Tarif (defini par le prof -- mensuel, par seance, par trimestre, ou autre)

### 3. Gestion des eleves

Fiche eleve :
- Nom complet
- Numero de telephone (eleve et/ou parent)
- Niveau scolaire + section
- Groupe(s) dans lesquels il est inscrit
- Statut (actif / inactif)

### 4. Gestion de la presence

Appel par seance :
- Le prof ouvre un groupe et un creneau
- Liste des eleves inscrits
- Marque chacun : Present / Absent / Retard / Justifie
- Sauvegarde avec date et heure

Historique :
- Vue par eleve, par groupe, et vue globale

### 5. Gestion des paiements

Modele flexible (le prof choisit pour chaque groupe) :
- Mensuel, par seance, par trimestre, montant libre

Suivi :
- Enregistrement manuel (montant, date, methode)
- Statut : Paye / En retard / Partiellement paye
- Historique par eleve
- Filtres : par groupe, par mois, par statut

Methodes (hors app) : Especes, BaridiMob, Virement CCP

### 6. Emploi du temps

- Vue prof : hebdomadaire + journaliere
- Vue eleve/parent : emploi du temps de l'eleve uniquement

### 7. Notifications

- Rappel de cours (configurable)
- Absence signalee (parent/eleve notifie)
- Rappel de paiement en retard
- Annulation/Report de seance

### 8. Tableau de bord (prof)

- Nombre total d'eleves
- Nombre de groupes actifs
- Revenus du mois en cours
- Seances du jour
- Eleves avec paiement en retard
- Taux de presence global

### 9. Niveaux scolaires (configurables)

Primaire : 1AP, 2AP, 3AP, 4AP, 5AP
Moyen (CEM) : 1AM, 2AM, 3AM, 4AM (BEM)
Lycee :
- 1AS (tronc commun : Sciences, Lettres)
- 2AS (Sc.Exp, Maths, Tech Maths, Gestion-Economie, Lettres et Philo, Langues Etrangeres)
- 3AS (memes filieres -- annee du BAC)

### 10. Monetisation

Freemium avec code d'activation :
- Gratuit : 1 groupe, 15 eleves, presence et paiements basiques
- Premium : groupes illimites, eleves illimites, notifications, stats, export PDF/Excel

### 11. Priorites

V1 -- MVP (ete 2026) :
- Auth prof (Supabase Auth)
- CRUD groupes (matiere, niveau, creneaux)
- CRUD eleves (inscription dans les groupes)
- Appel de presence par seance
- Suivi des paiements (enregistrement manuel)
- Tableau de bord prof basique
- Interface bilingue (francais/arabe)
- PWA installable

V2 -- Post-lancement :
- Espace eleve (consultation)
- Espace parent (consultation + notifications)
- Notifications push (OneSignal)
- Systeme de code d'activation (premium)
- Export PDF / Excel
- Mode hors ligne
- APK Android (Capacitor)
- Statistiques avancees

### 12. Ecrans principaux (V1)

1. Login / Inscription
2. Tableau de bord
3. Groupes (liste, creation, detail)
4. Eleves (liste, ajout, fiche)
5. Appel (prise de presence)
6. Paiements (suivi par eleve et par groupe)
7. Parametres (profil, matieres, niveaux, langue)
