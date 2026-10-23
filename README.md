# Muscu

Application de suivi de musculation (Push / Pull / Legs) : HTML, CSS et JavaScript sans framework.
Fonctionne **en local seul** (données dans le navigateur) ou **avec un compte** et une base PostgreSQL (Supabase) pour sauvegarder et synchroniser séances et statistiques entre appareils.

## Structure

```
index.html              page unique
manifest.json, sw.js    installation sur l'écran d'accueil + mode hors ligne
css/style.css           styles
data/                   exercices, séances et couleurs par défaut (JSON)
js/                     code (ordre de chargement : voir index.html)
js/views/               une vue par fichier
js/cloud.js             comptes et synchronisation
js/config.js            URL et clé Supabase (vide = mode local)
js/vendor/supabase.js   bibliothèque Supabase v2.45.4 (licence MIT)
supabase/schema.sql     schéma PostgreSQL + sécurité (à exécuter dans Supabase)
icons/                  icônes
```

## 1. Publier sur GitHub Pages

1. Envoie tout le contenu de ce dossier à la racine d'un dépôt.
2. Settings → Pages → Branch `main`, dossier `/ (root)`.
3. Sur iPhone : Safari → Partager → Sur l'écran d'accueil.

## 2. Comptes et base de données (Supabase)

Quand `js/config.js` est rempli, **la connexion est obligatoire** : au premier lancement l'app demande un nom d'utilisateur
et un mot de passe (création de compte ou connexion), puis la taille et le poids initial. Toutes les données
(profil, poids, séances types, séances réalisées, exercices personnalisés) sont enregistrées dans la base Supabase
et retrouvées sur chaque appareil connecté au même compte.

1. Crée un projet sur supabase.com (région européenne).
2. **SQL Editor** → New query → colle `supabase/schema.sql` → Run.
3. **Authentication → Providers → Email** : désactive **« Confirm email »** (obligatoire : les comptes n'ont pas
   de vraie adresse e-mail, aucun mail de confirmation ne peut être reçu). Mets « Minimum password length » à 8.
4. **Project Settings → API** : copie « Project URL » et la clé `anon public` dans `js/config.js`.
   La clé `anon` est publique par conception : la sécurité repose sur les règles RLS du schéma.
   **Ne mets jamais la clé `service_role` dans le front.**
5. Pousse la modification, puis change `muscu-v3` en `muscu-v4` dans `sw.js` pour vider le cache.

### Nom d'utilisateur
Supabase authentifie par e-mail : le nom d'utilisateur (3 à 30 caractères : lettres, chiffres, `.` `_` `-`, sans
distinction de majuscules) est converti en adresse technique `nom@muscu.app` (réglable via `USER_EMAIL_DOMAIN` dans
`js/config.js`). Aucun e-mail n'est envoyé. Si Supabase refuse cette adresse, mets un autre domaine.
**Conséquence : un mot de passe oublié ne peut pas être réinitialisé par e-mail.** Il se change depuis Profil
tant qu'on est connecté. Si tu veux une récupération par e-mail, il faut demander une vraie adresse à l'inscription.

### Où sont les données ?
- **La base Supabase est la référence.** À chaque connexion sur un nouvel appareil, tout est rechargé depuis la base.
- Chaque modification est envoyée à la base moins d'une seconde après, au retour du réseau, et quand l'app passe en arrière-plan.
- L'appareil garde une **copie de travail** pour afficher l'app instantanément et pouvoir s'entraîner sans réseau
  (les séries saisies sans connexion sont envoyées dès que le réseau revient). Cette copie est **effacée à la déconnexion**.
- Les suppressions sont propagées entre appareils. En cas de conflit sur un même élément, la dernière modification reçue
  par le serveur gagne.
- Les tables `session_sets`, `workout_items` et la vue `exercise_progress` sont remplies automatiquement par des
  triggers : elles permettent des statistiques en SQL (charge max, 1RM estimé, volume par exercice et par séance).

```sql
-- exemple : progression du développé couché
select performed_at::date, best_kg, round(est_1rm,1) as e1rm, volume
from exercise_progress where exercise_id = 'd_dc' order by performed_at;
```

### Sécurité et RGPD
- Chaque table est protégée par RLS : un utilisateur ne lit et n'écrit que ses lignes.
- Le poids est une donnée de santé : informe les utilisateurs de ce qui est stocké. L'export (Profil → Exporter) et la
  suppression du compte (Profil → Supprimer le compte, qui efface aussi toutes les données en ligne) sont dans l'app.
- Sur iPhone, l'app installée sur l'écran d'accueil a un stockage séparé de Safari : connecte-toi directement dans l'app installée.

## 3. Ajouter des vidéos par défaut

Dans `data/exercises.json`, renseigne le champ `"video"` d'un exercice avec un lien YouTube (`https://youtu.be/XXXXXXXXXXX`).
Sur un appareil qui a déjà des données : fiche de l'exercice → coller le lien.

## 4. Tester en local

```
python3 -m http.server 8000
```
puis ouvre http://localhost:8000 (un double-clic sur index.html ne marche pas : le navigateur bloque la lecture des JSON).
