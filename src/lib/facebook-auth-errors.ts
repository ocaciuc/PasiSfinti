/**
 * Mesaje prietenoase, în limba română, pentru erorile întâlnite la
 * autentificarea cu Facebook (OAuth). Acoperă cazuri de anulare,
 * refuz de permisiuni, timeout și probleme de rețea.
 */

export type FacebookErrorKind =
  | "cancelled"
  | "denied"
  | "timeout"
  | "network"
  | "config"
  | "rate_limited"
  | "unknown";

export interface FacebookErrorInfo {
  kind: FacebookErrorKind;
  title: string;
  message: string;
  /** Sugerează butonul de reîncercare în UI. */
  canRetry: boolean;
}

const TITLES: Record<FacebookErrorKind, string> = {
  cancelled: "Autentificare anulată",
  denied: "Permisiuni refuzate",
  timeout: "Conexiunea durează prea mult",
  network: "Probleme de conexiune",
  config: "Facebook indisponibil momentan",
  rate_limited: "Prea multe încercări",
  unknown: "Nu am putut continua cu Facebook",
};

/**
 * Clasifică o eroare Facebook OAuth pe baza codului/descrierii primite
 * fie din query/hash-ul de callback, fie dintr-un obiect de eroare.
 */
export function classifyFacebookOAuthError(input: {
  code?: string | null;
  description?: string | null;
  message?: string | null;
}): FacebookErrorInfo {
  const code = (input.code || "").toLowerCase();
  const description = (input.description || "").toLowerCase();
  const message = (input.message || "").toLowerCase();
  const haystack = `${code} ${description} ${message}`;

  // 1. Anulare explicită din partea utilizatorului
  if (
    haystack.includes("user_cancelled") ||
    haystack.includes("user canceled") ||
    haystack.includes("user_denied") ||
    haystack.includes("user closed") ||
    haystack.includes("login_cancel") ||
    code === "access_denied" && description.includes("cancel")
  ) {
    return {
      kind: "cancelled",
      title: TITLES.cancelled,
      message:
        "Ai închis fereastra Facebook înainte de finalizare. Apasă din nou pe „Continuă cu Facebook” când ești gata.",
      canRetry: true,
    };
  }

  // 2. Refuz de permisiuni (email/profil)
  if (
    code === "access_denied" ||
    haystack.includes("permissions_denied") ||
    haystack.includes("consent_required") ||
    haystack.includes("scope") && haystack.includes("denied")
  ) {
    return {
      kind: "denied",
      title: TITLES.denied,
      message:
        "Ai nevoie să accepți accesul la adresa de email pentru a te autentifica. Te rugăm să încerci din nou și să confirmi permisiunile.",
      canRetry: true,
    };
  }

  // 3. Timeout / cerere expirată
  if (
    haystack.includes("timeout") ||
    haystack.includes("timed out") ||
    haystack.includes("etimedout")
  ) {
    return {
      kind: "timeout",
      title: TITLES.timeout,
      message:
        "Facebook nu a răspuns la timp. Verifică conexiunea la internet și încearcă din nou.",
      canRetry: true,
    };
  }

  // 4. Probleme de rețea
  if (
    haystack.includes("failed to fetch") ||
    haystack.includes("networkerror") ||
    haystack.includes("network request failed") ||
    haystack.includes("offline") ||
    haystack.includes("err_internet_disconnected")
  ) {
    return {
      kind: "network",
      title: TITLES.network,
      message:
        "Nu te-am putut conecta la Facebook. Verifică conexiunea la internet și încearcă din nou.",
      canRetry: true,
    };
  }

  // 5. Limitări de rată
  if (
    haystack.includes("rate limit") ||
    haystack.includes("too many requests") ||
    code === "over_request_rate_limit"
  ) {
    return {
      kind: "rate_limited",
      title: TITLES.rate_limited,
      message:
        "Au fost prea multe încercări într-un timp scurt. Te rugăm să aștepți câteva minute înainte de a relua.",
      canRetry: true,
    };
  }

  // 6. Provider dezactivat / configurare lipsă
  if (
    haystack.includes("provider is not enabled") ||
    haystack.includes("provider not enabled") ||
    haystack.includes("unsupported_provider") ||
    haystack.includes("server_error") ||
    haystack.includes("temporarily_unavailable") ||
    haystack.includes("oauth state") ||
    haystack.includes("invalid_client")
  ) {
    return {
      kind: "config",
      title: TITLES.config,
      message:
        "Autentificarea cu Facebook este momentan indisponibilă. Te rugăm să încerci mai târziu sau să folosești email-ul.",
      canRetry: true,
    };
  }

  // 7. Fallback general
  return {
    kind: "unknown",
    title: TITLES.unknown,
    message:
      "A apărut o problemă neprevăzută la autentificarea cu Facebook. Te rugăm să încerci din nou sau să folosești o altă metodă.",
    canRetry: true,
  };
}

/**
 * Variantă convenabilă pentru obiecte de eroare aruncate de SDK/Supabase.
 */
export function classifyFacebookErrorFromException(
  error: unknown
): FacebookErrorInfo {
  if (!error) return classifyFacebookOAuthError({});
  if (typeof error === "string") {
    return classifyFacebookOAuthError({ message: error });
  }
  if (typeof error === "object") {
    const e = error as { message?: string; code?: string; name?: string };
    return classifyFacebookOAuthError({
      code: e.code ?? null,
      message: `${e.name ?? ""} ${e.message ?? ""}`.trim(),
    });
  }
  return classifyFacebookOAuthError({});
}

/** Timeout (ms) după care considerăm că redirectul către Facebook a eșuat. */
export const FACEBOOK_OAUTH_TIMEOUT_MS = 20000;
