/**
 * Clés de permissions pour les rôles.
 * Utilisées pour définir les accès par rôle et pour le menu dashboard.
 */
export const PERMISSION_OPTIONS: { key: string; label: string }[] = [
  { key: "full_access", label: "Accès total (tous les modules)" },
  { key: "subjects", label: "Matières" },
  { key: "classes", label: "Classes" },
  { key: "academic-years", label: "Années et périodes" },
  { key: "teachers", label: "Professeurs" },
  { key: "schedule", label: "Horaires" },
  { key: "students", label: "Inscription" },
  { key: "economat", label: "Économat" },
  { key: "grades", label: "Saisie des notes" },
  { key: "discipline", label: "Discipline" },
  { key: "formation-classe", label: "Formation de classe" },
  { key: "fiche-eleve", label: "Fiche élève" },
  { key: "school", label: "Gestion établissement" },
  { key: "users", label: "Gestion Utilisateurs" },
];
