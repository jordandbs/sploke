/* Configuration Supabase (facultative).
   Laisse vide pour utiliser l'app en mode local uniquement.
   Supabase → Project Settings → API : copie "Project URL" et la clé "anon public".
   La clé anon est publique par conception (la sécurité repose sur les règles RLS du schéma SQL).
   Ne mets JAMAIS la clé "service_role" ici. */
window.MUSCU_CONFIG={
  SUPABASE_URL:'',
  SUPABASE_ANON_KEY:'',
  /* Les comptes se font par nom d'utilisateur : Supabase reçoit "nom@USER_EMAIL_DOMAIN" (aucun e-mail n'est envoyé). */
  USER_EMAIL_DOMAIN:'muscu.app'
};
