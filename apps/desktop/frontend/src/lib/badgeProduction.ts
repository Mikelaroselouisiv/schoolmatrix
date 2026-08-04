import { API_BASE, fetchWithAuth, getImageUrl } from "@/src/lib/api";
import {
  BadgeSchoolInfo,
  BadgeSignatureInfo,
  BadgeStudentInfo,
  getStudentBadgesPdfBlob,
} from "@/src/lib/badgePdf";

type SchoolLike = {
  name?: string;
  slogan?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
} | null;

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

/** Base API réelle pour /uploads (évite le préfixe /api Next si édition desktop). */
function resolveUploadsApiBase(): string {
  if (typeof window !== "undefined" && window.schoolmatrixDesktop?.apiBase) {
    return window.schoolmatrixDesktop.apiBase.replace(/\/$/, "");
  }
  // Next proxy : /api → backend
  if (API_BASE === "/api" || API_BASE.endsWith("/api")) {
    return API_BASE.replace(/\/$/, "");
  }
  return API_BASE.replace(/\/$/, "");
}

export async function fetchDirecteurSignature(): Promise<BadgeSignatureInfo | null> {
  try {
    const res = await fetchWithAuth(`${API_BASE}/school/signatures`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const list = (data.signatures ?? []) as Array<{
      slot_key: string;
      signer_name?: string;
      signer_role?: string;
      image_url?: string | null;
    }>;
    const dg = list.find((s) => s.slot_key === "directeur_general");
    if (!dg) return null;
    return {
      signer_name: dg.signer_name ?? "",
      signer_role: dg.signer_role ?? "Directeur / Directrice Général(e)",
      image_url: dg.image_url ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchRoomNameForClass(classId: string | null | undefined): Promise<string | null> {
  if (!classId) return null;
  try {
    const res = await fetchWithAuth(`${API_BASE}/classes`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const cls = (data.classes ?? []).find((c: { id: string }) => c.id === classId);
    return cls?.room_name ?? null;
  } catch {
    return null;
  }
}

export async function buildBadgesPdfBlob(params: {
  school: SchoolLike;
  students: BadgeStudentInfo[];
}): Promise<Blob> {
  const school = params.school;
  if (!school?.name) {
    throw new Error("Profil établissement introuvable");
  }
  const signature = await fetchDirecteurSignature();
  const schoolInfo: BadgeSchoolInfo = {
    name: school.name,
    slogan: school.slogan,
    address: school.address,
    phone: school.phone,
    email: school.email,
    logo_url: school.logo_url,
    primary_color: school.primary_color,
    secondary_color: school.secondary_color,
  };
  return getStudentBadgesPdfBlob({
    school: schoolInfo,
    students: params.students,
    signature,
    resolveUrl: getImageUrl,
    apiBase: resolveUploadsApiBase(),
    token: getToken(),
  });
}

export async function fetchStudentsForClassBadges(classId: string): Promise<BadgeStudentInfo[]> {
  const [studentsRes, classesRes] = await Promise.all([
    fetchWithAuth(`${API_BASE}/students?class_id=${encodeURIComponent(classId)}`),
    fetchWithAuth(`${API_BASE}/classes`),
  ]);
  const studentsData = await studentsRes.json().catch(() => ({}));
  const classesData = await classesRes.json().catch(() => ({}));
  if (!studentsRes.ok) {
    throw new Error(studentsData.message || "Impossible de charger les élèves");
  }
  const roomName =
    (classesData.classes ?? []).find((c: { id: string }) => c.id === classId)?.room_name ?? null;
  const list = (studentsData.students ?? []) as Array<{
    first_name: string;
    last_name: string;
    order_number?: string | null;
    class_name?: string | null;
    photo_identity_student?: string | null;
  }>;
  return list
    .slice()
    .sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
    )
    .map((s) => ({
      first_name: s.first_name,
      last_name: s.last_name,
      order_number: s.order_number,
      class_name: s.class_name,
      room_name: roomName,
      photo_url: s.photo_identity_student,
    }));
}

export async function fetchStudentsForRoomBadges(roomId: string): Promise<{
  students: BadgeStudentInfo[];
  roomName: string;
}> {
  const classesRes = await fetchWithAuth(`${API_BASE}/classes`);
  const classesData = await classesRes.json().catch(() => ({}));
  if (!classesRes.ok) {
    throw new Error(classesData.message || "Impossible de charger les classes");
  }
  const classes = (classesData.classes ?? []) as Array<{
    id: string;
    name: string;
    room_id: string | null;
    room_name: string | null;
  }>;
  const inRoom = classes.filter((c) => c.room_id === roomId);
  if (!inRoom.length) {
    throw new Error("Aucune classe n’est assignée à cette salle");
  }
  const roomName = inRoom[0].room_name || "Salle";
  const batches = await Promise.all(
    inRoom.map(async (c) => {
      const res = await fetchWithAuth(
        `${API_BASE}/students?class_id=${encodeURIComponent(c.id)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return [] as BadgeStudentInfo[];
      return ((data.students ?? []) as Array<{
        first_name: string;
        last_name: string;
        order_number?: string | null;
        class_name?: string | null;
        photo_identity_student?: string | null;
      }>).map((s) => ({
        first_name: s.first_name,
        last_name: s.last_name,
        order_number: s.order_number,
        class_name: s.class_name ?? c.name,
        room_name: roomName,
        photo_url: s.photo_identity_student,
      }));
    }),
  );
  const students = batches
    .flat()
    .sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
    );
  if (!students.length) {
    throw new Error("Aucun élève dans les classes de cette salle");
  }
  return { students, roomName };
}
