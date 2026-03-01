const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  users: "Gestion Utilisateurs",
  teachers: "Professeurs",
  classes: "Classes",
  students: "Inscription",
  "formation-classe": "Formation de classe",
  subjects: "Matières",
  schedule: "Horaires",
  economat: "Économat",
  school: "Gestion établissement",
  grades: "Saisie des notes",
  "academic-years": "Années et périodes",
  coefficients: "Coefficients",
  roles: "Rôles",
  discipline: "Discipline",
  "fiche-eleve": "Fiche élève",
};

export function getBreadcrumbSegments(pathname: string): { href: string; label: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const result: { href: string; label: string }[] = [];
  let href = "";
  for (const seg of segments) {
    href += `/${seg}`;
    const label = ROUTE_LABELS[seg] ?? (seg.length <= 36 && /^[0-9a-f-]+$/i.test(seg) ? "Détail" : seg);
    result.push({ href, label });
  }
  return result;
}
