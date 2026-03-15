/**
 * Autorisations au tableau de bord : gérées uniquement côté frontend.
 * Chaque rôle voit uniquement les entrées de menu auxquelles il a accès.
 * Le backend accepte tout utilisateur authentifié sur les mêmes API.
 *
 * Règles :
 * - SUPER_ADMIN, DIRECTEUR_GENERAL, SCHOOL_ADMIN : accès total à tout.
 * - Directeur pédagogique : Horaires, Saisie des notes.
 * - Censeur : Horaires, Saisie des notes (identique au directeur pédagogique).
 * - Admin préscolaire / fondamental / secondaire : Horaires uniquement.
 * - Économe : Tableau de bord et Économat uniquement.
 * - Responsable discipline : Tableau de bord et Discipline (appel, retard, points).
 * - Enseignant, Parent : Tableau de bord uniquement (vue moniteur / profil).
 */

/** Rôles qui voient tout (administration, économat, gestion établissement). */
export const ROLES_FULL: string[] = [
  "SUPER_ADMIN",
  "DIRECTEUR_GENERAL",
  "SCHOOL_ADMIN",
];

/** Rôles qui voient Horaires et Saisie des notes. */
const ROLES_HORAIRES_ET_NOTES: string[] = ["DIRECTEUR_PEDAGOGIQUE", "CENSEUR"];

/** Rôles qui voient uniquement Horaires. */
const ROLES_HORAIRES_SEUL: string[] = [
  "ADMIN_PRESCOLAIRE",
  "ADMIN_FONDAMENTAL",
  "ADMIN_SECONDAIRE",
];

/** Rôles qui voient uniquement l’économat (en plus du tableau de bord). */
const ROLES_ECONOME: string[] = ["ECONOME"];

/** Rôles qui voient Discipline (appel, retard, points disciplinaires). */
const ROLES_DISCIPLINE: string[] = ["DISCIPLINE"];

function canSeeNavItem(roleName: string, allowedRoles: string[]): boolean {
  if (allowedRoles.length === 0) return true;
  return allowedRoles.includes(roleName);
}

function canSeeByPermissions(permissionKey: string, rolePermissions: string[]): boolean {
  if (rolePermissions.includes("full_access")) return true;
  if (permissionKey === "dashboard") return true;
  if (permissionKey === "finance") return rolePermissions.includes("finance") || rolePermissions.includes("economat");
  return rolePermissions.includes(permissionKey);
}

export type NavBlock = "configuration" | "management" | "finance" | "fiche" | "special";

export type NavItem = {
  href: string;
  label: string;
  allowedRoles: string[];
  permissionKey: string;
  block: NavBlock;
};

/** Entrées du menu dashboard avec les rôles autorisés et le bloc d'affichage. */
export const DASHBOARD_NAV: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", allowedRoles: [], permissionKey: "dashboard", block: "configuration" },
  // Bloc Configuration : Matière, Classes, Années et périodes, Professeurs, Horaires
  { href: "/dashboard/subjects", label: "Matières", allowedRoles: [...ROLES_FULL], permissionKey: "subjects", block: "configuration" },
  { href: "/dashboard/classes", label: "Classes", allowedRoles: [...ROLES_FULL], permissionKey: "classes", block: "configuration" },
  { href: "/dashboard/academic-years", label: "Années et périodes", allowedRoles: [...ROLES_FULL], permissionKey: "academic-years", block: "configuration" },
  { href: "/dashboard/teachers", label: "Professeurs", allowedRoles: [...ROLES_FULL], permissionKey: "teachers", block: "configuration" },
  { href: "/dashboard/schedule", label: "Horaires", allowedRoles: [...ROLES_FULL, ...ROLES_HORAIRES_ET_NOTES, ...ROLES_HORAIRES_SEUL], permissionKey: "schedule", block: "configuration" },
  // Bloc Management (vie étudiante) : Inscription, Saisie de notes, Discipline, Formation de classe
  { href: "/dashboard/students", label: "Inscription", allowedRoles: [...ROLES_FULL], permissionKey: "students", block: "management" },
  { href: "/dashboard/grades", label: "Saisie des notes", allowedRoles: [...ROLES_FULL, ...ROLES_HORAIRES_ET_NOTES, "TEACHER"], permissionKey: "grades", block: "management" },
  { href: "/dashboard/discipline", label: "Discipline", allowedRoles: [...ROLES_FULL, ...ROLES_DISCIPLINE], permissionKey: "discipline", block: "management" },
  { href: "/dashboard/formation-classe", label: "Formation de classe", allowedRoles: [...ROLES_FULL], permissionKey: "formation-classe", block: "management" },
  // Bloc Finance : Économat, Dépenses, Moniteur Finance, Comptabilité
  { href: "/dashboard/economat", label: "Économat", allowedRoles: [...ROLES_FULL, ...ROLES_ECONOME], permissionKey: "finance", block: "finance" },
  { href: "/dashboard/depenses", label: "Dépenses", allowedRoles: [...ROLES_FULL, ...ROLES_ECONOME], permissionKey: "finance", block: "finance" },
  { href: "/dashboard/moniteur-finance", label: "Moniteur Finance", allowedRoles: [...ROLES_FULL, ...ROLES_ECONOME], permissionKey: "finance", block: "finance" },
  { href: "/dashboard/comptabilite", label: "Comptabilité", allowedRoles: [...ROLES_FULL, ...ROLES_ECONOME], permissionKey: "finance", block: "finance" },
  // Bloc Fiche élève (dominant, seul)
  {
    href: "/dashboard/fiche-eleve",
    label: "Fiche élève",
    allowedRoles: [...ROLES_FULL, ...ROLES_HORAIRES_ET_NOTES, ...ROLES_HORAIRES_SEUL, ...ROLES_ECONOME, "PARENT"],
    permissionKey: "fiche-eleve",
    block: "fiche",
  },
];

export const SCHOOL_NAV = { href: "/dashboard/school", label: "Gestion établissement", permissionKey: "school", block: "special" as const };
export const USERS_NAV = { href: "/dashboard/users", label: "Gestion Utilisateurs", permissionKey: "users", block: "special" as const };

/** Vérifie si un rôle peut accéder à un chemin (pour redirection si accès interdit). */
export function canAccessPath(roleName: string, path: string, rolePermissions?: string[]): boolean {
  if (path === "/dashboard") return true;
  if (rolePermissions && rolePermissions.length > 0) {
    if (rolePermissions.includes("full_access")) return true;
    if (path === SCHOOL_NAV.href || path.startsWith(SCHOOL_NAV.href + "/")) {
      return canSeeByPermissions("school", rolePermissions);
    }
    if (path === USERS_NAV.href || path.startsWith(USERS_NAV.href + "/")) {
      return canSeeByPermissions("users", rolePermissions);
    }
    const item = DASHBOARD_NAV.find(
      (n) => n.href !== "/dashboard" && (n.href === path || path.startsWith(n.href + "/"))
    );
    if (!item) return false;
    return canSeeByPermissions(item.permissionKey, rolePermissions);
  }
  if (ROLES_FULL.includes(roleName)) return true;
  if (path === SCHOOL_NAV.href || path.startsWith(SCHOOL_NAV.href + "/")) {
    return canSeeNavItem(roleName, ROLES_FULL);
  }
  if (path === USERS_NAV.href || path.startsWith(USERS_NAV.href + "/")) {
    return canSeeNavItem(roleName, ROLES_FULL);
  }
  const item = DASHBOARD_NAV.find(
    (n) => n.href !== "/dashboard" && (n.href === path || path.startsWith(n.href + "/"))
  );
  if (!item) return false;
  return canSeeNavItem(roleName, item.allowedRoles);
}

const BLOCK_ORDER: NavBlock[] = ["configuration", "management", "finance", "fiche", "special"];

/** Retourne les entrées de menu visibles pour un rôle, ordonnées par bloc (pour les raccourcis). */
export function getNavItemsForRole(
  roleName: string,
  rolePermissions?: string[]
): { href: string; label: string; block?: NavBlock }[] {
  const items: { href: string; label: string; block?: NavBlock }[] = [];
  const usePermissions = rolePermissions && rolePermissions.length > 0;

  for (const block of BLOCK_ORDER) {
    for (const item of DASHBOARD_NAV) {
      if (item.href === "/dashboard") continue;
      if (item.block !== block) continue;
      const canSee = usePermissions
        ? canSeeByPermissions(item.permissionKey, rolePermissions)
        : canSeeNavItem(roleName, item.allowedRoles);
      if (canSee) {
        items.push({ href: item.href, label: item.label, block });
      }
    }
    if (block === "special") {
      const canSeeUsers = usePermissions
        ? canSeeByPermissions("users", rolePermissions)
        : canSeeNavItem(roleName, ROLES_FULL);
      const canSeeSchool = usePermissions
        ? canSeeByPermissions("school", rolePermissions)
        : canAccessSchoolProfile(roleName);
      if (canSeeUsers) items.push(USERS_NAV);
      if (canSeeSchool) items.push(SCHOOL_NAV);
    }
  }
  return items;
}

/** Vérifie si un rôle peut accéder à la page Gestion établissement. */
export function canAccessSchoolProfile(roleName: string): boolean {
  return ROLES_FULL.includes(roleName);
}

/**
 * Rôles "moniteur" : uniquement le tableau de bord avec bloc Profil / Moniteur
 * (pas d’accès aux menus de gestion : classes, élèves, professeurs, etc.).
 * Enseignant et Parent voient seulement cette vue.
 */
export function isMonitorOnlyRole(roleName: string): boolean {
  return roleName === "PARENT";
}
