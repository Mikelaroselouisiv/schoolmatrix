/** Emplacements de signature prédéfinis (miroirs du backend). */
export const FIXED_SIGNATURE_SLOTS = [
  {
    slot_key: "directeur_general",
    default_role: "Directeur / Directrice Général(e)",
    sort_order: 0,
  },
  {
    slot_key: "econome",
    default_role: "Économe",
    sort_order: 1,
  },
  {
    slot_key: "coord_prescolaire",
    default_role: "Coordonnateur / Coordonnatrice du préscolaire",
    sort_order: 2,
  },
  {
    slot_key: "coord_fondamentale",
    default_role: "Coordonnateur / Coordonnatrice du fondamentale",
    sort_order: 3,
  },
  {
    slot_key: "coord_secondaire",
    default_role: "Coordonnateur / Coordonnatrice du secondaire",
    sort_order: 4,
  },
] as const;

/** Liste déroulante des rôles (+ Autre pour saisie libre). */
export const ROLE_OPTIONS = [
  ...FIXED_SIGNATURE_SLOTS.map((s) => s.default_role),
  "Directeur / Directrice adjoint(e)",
  "Secrétaire",
  "Surveillant / Surveillante général(e)",
  "Responsable pédagogique",
  "Autre",
] as const;

export const EXTRA_SIGNATURE_SLOT = "extra";

export type SignatureForm = {
  id: string | null;
  slot_key: string;
  signer_name: string;
  signer_role: string;
  image_url: string | null;
  sort_order: number;
  is_fixed: boolean;
  _key: string;
  /** Valeur du select (dont "Autre") */
  role_choice: string;
};

export function buildDefaultSignatures(): SignatureForm[] {
  return FIXED_SIGNATURE_SLOTS.map((slot) => ({
    id: null,
    slot_key: slot.slot_key,
    signer_name: "",
    signer_role: slot.default_role,
    image_url: null,
    sort_order: slot.sort_order,
    is_fixed: true,
    _key: slot.slot_key,
    role_choice: slot.default_role,
  }));
}

function roleChoiceFrom(signerRole: string, isFixed: boolean, defaultRole: string): string {
  if (isFixed) return defaultRole;
  if ((ROLE_OPTIONS as readonly string[]).includes(signerRole)) return signerRole;
  return "Autre";
}

/** Fusionne la réponse API dans les 5 emplacements fixes + extras. */
export function mergeSignaturesFromApi(
  apiList: Array<{
    id: string | null;
    slot_key: string;
    signer_name: string;
    signer_role: string;
    image_url: string | null;
    sort_order: number;
    is_fixed?: boolean;
  }>,
): SignatureForm[] {
  const defaults = buildDefaultSignatures();
  const bySlot = new Map(
    apiList.filter((s) => s.slot_key !== EXTRA_SIGNATURE_SLOT).map((s) => [s.slot_key, s]),
  );
  const fixed = defaults.map((d) => {
    const fromApi = bySlot.get(d.slot_key);
    if (!fromApi) return d;
    return {
      ...d,
      id: fromApi.id,
      signer_name: fromApi.signer_name ?? "",
      signer_role: fromApi.signer_role || d.signer_role,
      image_url: fromApi.image_url ?? null,
      sort_order: fromApi.sort_order ?? d.sort_order,
      role_choice: d.role_choice,
    };
  });

  const extras = apiList
    .filter((s) => s.slot_key === EXTRA_SIGNATURE_SLOT)
    .map((s, i) => {
      const choice = roleChoiceFrom(s.signer_role, false, "");
      return {
        id: s.id,
        slot_key: EXTRA_SIGNATURE_SLOT,
        signer_name: s.signer_name ?? "",
        signer_role: s.signer_role ?? "",
        image_url: s.image_url ?? null,
        sort_order: s.sort_order ?? 100 + i,
        is_fixed: false,
        _key: s.id ?? `extra-${i}`,
        role_choice: choice,
      } satisfies SignatureForm;
    });

  return [...fixed, ...extras];
}

export function displayRoleLabel(sig: SignatureForm): string {
  if (sig.role_choice === "Autre") {
    return sig.signer_role.trim() || "Autre";
  }
  return sig.signer_role || sig.role_choice || "Signature";
}
