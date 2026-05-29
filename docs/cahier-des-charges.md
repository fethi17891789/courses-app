# Cahier des Charges — Courses App

## 1. Présentation du projet

**Nom** : Courses
**Description** : Application de gestion de cours de soutien destinée au marché algérien.
**Objectif** : Permettre aux professeurs de cours de soutien de gérer leurs élèves, groupes, emplois du temps, présences et paiements. Les élèves et parents ont accès à un espace de suivi.
**Plateforme** : PWA (Progressive Web App) — accessible sur iOS et Android via navigateur.

---

## 2. Utilisateurs et rôles

### 2.1 Professeur (rôle principal)
- Crée et gère son compte
- Configure ses matières et niveaux
- Crée des groupes et des créneaux horaires
- Inscrit les élèves dans les groupes
- Fait l'appel (présence/absence) à chaque séance
- Suit les paiements de chaque élève
- Consulte des statistiques (nombre d'élèves, revenus, taux de présence)

### 2.2 Élève
- Consulte son emploi du temps (groupes auxquels il est inscrit)
- Voit son historique de présence/absence
- Voit l'état de ses paiements
- Reçoit des notifications (rappel de cours, absence signalée)

### 2.3 Parent
- Lié à un ou plusieurs enfants (élèves)
- Consulte la présence/absence de son enfant
- Consulte l'état des paiements
- Reçoit des notifications (absence, retard de paiement, rappel de cours)

---

## 3. Fonctionnalités principales

### 3.1 Gestion des groupes

Un prof peut avoir **plusieurs matières**, **plusieurs niveaux**, et **plusieurs groupes par niveau**.

**Groupe** :
- Nom (libre ou auto-généré)
- Matière (ex: Maths, Physique, Français...)
- Niveau scolaire (configurable par le prof : primaire, CEM, lycée, avec l'année et la section)
- Capacité maximale (nombre de places)
- Un ou plusieurs créneaux horaires (jour + heure début + heure fin)
- Tarif (défini par le prof — mensuel, par séance, par trimestre, ou autre)

**Exemples** :
- "Maths 3AS Sc.Exp — Groupe A" → Dimanche 14h-16h + Mercredi 10h-12h
- "Physique 2AS Maths — Groupe B" → Lundi 16h-18h
- "Maths 4AM — Groupe 1" → Samedi 8h-10h

### 3.2 Gestion des élèves

**Fiche élève** :
- Nom complet
- Numéro de téléphone (de l'élève et/ou du parent)
- Niveau scolaire + section
- Groupe(s) dans lesquels il est inscrit
- Statut (actif / inactif)

**Actions** :
- Inscrire un élève dans un ou plusieurs groupes
- Désinscrire un élève d'un groupe
- Rechercher / filtrer les élèves (par groupe, niveau, statut de paiement)

### 3.3 Gestion de la présence

**Appel par séance** :
- Le prof ouvre un groupe et un créneau
- La liste des élèves inscrits s'affiche
- Il marque chacun : Présent / Absent / Retard / Justifié
- L'appel est sauvegardé avec la date et l'heure

**Historique** :
- Vue par élève : toutes ses séances (présent/absent)
- Vue par groupe : taux de présence par séance
- Vue globale : statistiques de présence

### 3.4 Gestion des paiements

**Modèle flexible** (c'est le prof qui choisit pour chaque groupe) :
- Paiement mensuel (montant fixe par mois)
- Paiement par séance
- Paiement par trimestre
- Montant libre / personnalisé

**Suivi** :
- Chaque paiement est enregistré manuellement par le prof (montant, date, méthode)
- Statut de paiement par élève : Payé / En retard / Partiellement payé
- Historique des paiements par élève
- Vue d'ensemble : qui a payé, qui doit encore payer
- Filtres : par groupe, par mois, par statut

**Méthodes de paiement** (hors app, enregistrement seulement) :
- Espèces
- BaridiMob
- Virement CCP

### 3.5 Emploi du temps

**Vue prof** :
- Emploi du temps hebdomadaire avec tous ses groupes et créneaux
- Vue journalière : les séances du jour

**Vue élève/parent** :
- Emploi du temps de l'élève uniquement (ses groupes)

### 3.6 Notifications

- **Rappel de cours** : notification avant chaque séance (configurable : 1h avant, 30min avant...)
- **Absence signalée** : le parent/élève est notifié après l'appel si marqué absent
- **Rappel de paiement** : notification quand un paiement est en retard
- **Annulation/Report** : le prof peut envoyer une notification à tout un groupe

### 3.7 Tableau de bord (prof)

- Nombre total d'élèves
- Nombre de groupes actifs
- Revenus du mois en cours
- Séances du jour
- Élèves avec paiement en retard
- Taux de présence global

---

## 4. Niveaux scolaires

Le prof configure les niveaux qu'il enseigne. Voici la structure du système éducatif algérien :

### Primaire
- 1AP, 2AP, 3AP, 4AP, 5AP

### Moyen (CEM)
- 1AM, 2AM, 3AM, 4AM (BEM)

### Lycée
- 1AS (tronc commun : Sciences, Lettres)
- 2AS (Sciences Expérimentales, Mathématiques, Technique Maths, Gestion-Économie, Lettres et Philosophie, Langues Étrangères)
- 3AS (mêmes filières que 2AS — année du BAC)

---

## 5. Parcours utilisateur

### 5.1 Inscription du prof
1. Le prof crée son compte (email + mot de passe)
2. Il renseigne : nom, matière(s), numéro de téléphone
3. Il configure les niveaux qu'il enseigne
4. Il crée ses premiers groupes avec les créneaux horaires
5. Il ajoute ses élèves et les inscrit dans les groupes

### 5.2 Inscription de l'élève
1. Le prof ajoute l'élève dans l'app (nom, téléphone, niveau)
2. L'élève reçoit un lien pour créer son compte (optionnel)
3. L'élève peut consulter son espace (emploi du temps, présence, paiements)

### 5.3 Inscription du parent
1. Le parent reçoit un lien d'invitation du prof (ou de l'élève)
2. Il crée son compte et lie son enfant
3. Il peut suivre la présence et les paiements de son enfant

### 5.4 Séance type
1. Le prof ouvre l'app avant sa séance
2. Il voit les séances du jour dans le tableau de bord
3. Il ouvre le groupe concerné
4. Il fait l'appel (présent/absent pour chaque élève)
5. Les parents des absents reçoivent une notification
6. En fin de mois, il vérifie les paiements et relance les retards

---

## 6. Monétisation de l'app

### Modèle
- **Freemium** avec code d'activation
- Paiement hors app (BaridiMob, virement CCP)
- Le prof paie → reçoit un code d'activation → débloque les fonctionnalités premium

### Gratuit
- Jusqu'à 1 groupe
- Jusqu'à 15 élèves
- Présence et paiements basiques

### Premium (prix à définir)
- Groupes illimités
- Élèves illimités
- Notifications push
- Statistiques avancées
- Export des données (PDF, Excel)

---

## 7. Contraintes techniques

- **PWA** : doit fonctionner comme une app native (installable, hors ligne basique)
- **Responsive** : optimisé mobile d'abord (les profs utilisent leur téléphone)
- **RTL** : support arabe (direction droite-à-gauche)
- **Hors ligne** : l'appel doit pouvoir se faire même sans connexion, puis se synchroniser
- **Performance** : chargement rapide, même sur un réseau 3G algérien
- **Sécurité** : les données des élèves sont sensibles (mineurs)

---

## 8. Priorités de développement

### V1 — MVP (objectif : été 2026)
- [ ] Authentification prof (Supabase Auth)
- [ ] CRUD groupes (matière, niveau, créneaux)
- [ ] CRUD élèves (inscription dans les groupes)
- [ ] Appel de présence par séance
- [ ] Suivi des paiements (enregistrement manuel)
- [ ] Tableau de bord prof basique
- [ ] Interface bilingue (français/arabe)
- [ ] Mode sombre/clair
- [ ] PWA installable

### V2 — Post-lancement
- [ ] Espace élève (consultation)
- [ ] Espace parent (consultation + notifications)
- [ ] Notifications push (OneSignal)
- [ ] Système de code d'activation (premium)
- [ ] Export PDF / Excel
- [ ] Mode hors ligne (appel sans connexion)
- [ ] APK Android (Capacitor)
- [ ] Statistiques avancées

---

## 9. Écrans principaux (V1)

1. **Login / Inscription**
2. **Tableau de bord** — vue d'ensemble de la journée
3. **Groupes** — liste, création, détail d'un groupe
4. **Élèves** — liste, ajout, fiche élève
5. **Appel** — prise de présence pour une séance
6. **Paiements** — suivi par élève et par groupe
7. **Paramètres** — profil, matières, niveaux, langue, thème
