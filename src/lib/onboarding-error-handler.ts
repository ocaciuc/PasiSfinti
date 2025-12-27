import { PostgrestError, AuthError } from "@supabase/supabase-js";

export type OnboardingRecoveryAction = 
  | { type: "redirect"; to: "/" | "/auth" }
  | { type: "retry" }
  | { type: "show-message"; message: string; then: OnboardingRecoveryAction };

export interface OnboardingErrorResult {
  userMessage: string;
  recovery: OnboardingRecoveryAction;
  shouldBlock: boolean;
}

/**
 * Translates common Supabase/database error messages to Romanian
 */
export function translateSupabaseError(error: PostgrestError | AuthError | Error | unknown): string {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);

  // PostgreSQL error codes
  const pgErrorMap: Record<string, string> = {
    "23505": "Această înregistrare există deja.",
    "23503": "Eroare de referință a datelor.",
    "23502": "Câmpuri obligatorii lipsă.",
    "23514": "Datele nu respectă regulile de validare.",
    "42501": "Nu ai permisiunea să efectuezi această acțiune.",
    "42P01": "Tabelul nu a fost găsit.",
    "28P01": "Autentificare eșuată.",
    "P0001": "Eroare de validare a datelor.",
    "PGRST301": "Eroare de conexiune la server.",
    "PGRST116": "Nu s-au găsit date.",
    "PGRST204": "Cerere invalidă.",
  };

  // Supabase Auth error codes (returned as error.code)
  const authErrorCodeMap: Record<string, string> = {
    "weak_password": "Parola este prea slabă. Trebuie să conțină cel puțin 8 caractere, incluzând: literă mică, literă mare, cifră și caracter special (!@#$%^&* etc.).",
    "email_address_invalid": "Adresa de email nu este validă. Te rugăm să verifici și să încerci din nou.",
    "invalid_credentials": "Email sau parolă incorectă.",
    "email_not_confirmed": "Te rugăm să îți confirmi adresa de email înainte de autentificare.",
    "user_already_exists": "Acest email este deja înregistrat. Încerci să te autentifici?",
    "user_not_found": "Nu am găsit un cont asociat acestui email.",
    "email_exists": "Acest email este deja înregistrat.",
    "over_request_rate_limit": "Prea multe încercări. Te rugăm să aștepți câteva minute.",
    "over_email_send_rate_limit": "Prea multe emailuri trimise. Te rugăm să aștepți câteva minute.",
    "signup_disabled": "Înregistrările sunt dezactivate momentan.",
    "validation_failed": "Datele introduse nu sunt valide.",
    "bad_json": "Eroare la procesarea datelor.",
    "bad_jwt": "Sesiune invalidă. Te rugăm să te autentifici din nou.",
    "session_not_found": "Sesiunea a expirat. Te rugăm să te autentifici din nou.",
    "same_password": "Noua parolă trebuie să fie diferită de parola actuală.",
    "reauthentication_needed": "Te rugăm să te autentifici din nou pentru a continua.",
    "otp_expired": "Linkul de resetare a expirat. Te rugăm să soliciți un nou link.",
    "flow_state_expired": "Linkul de resetare a expirat. Te rugăm să soliciți un nou link.",
    "flow_state_not_found": "Linkul de resetare este invalid. Te rugăm să soliciți un nou link.",
  };

  // Check for Supabase Auth error code first
  if (errorCode && authErrorCodeMap[errorCode]) {
    return authErrorCodeMap[errorCode];
  }

  // Check for PostgreSQL error code
  if (errorCode && pgErrorMap[errorCode]) {
    return pgErrorMap[errorCode];
  }

  // Message pattern matching for Romanian translation
  const messagePatterns: Array<[RegExp | string, string]> = [
    // Weak password specific patterns
    [/Password should be at least 8 characters/i, "Parola trebuie să aibă cel puțin 8 caractere."],
    [/Password should contain at least one character of each/i, "Parola trebuie să conțină cel puțin: o literă mică, o literă mare, o cifră și un caracter special (!@#$%^&* etc.)."],
    [/weak_password/i, "Parola este prea slabă. Folosește cel puțin 8 caractere cu litere mari, mici, cifre și caractere speciale."],
    
    // Email validation patterns
    [/email.*invalid/i, "Adresa de email nu este validă."],
    [/invalid email/i, "Adresa de email nu este validă."],
    [/Unable to validate email address/i, "Nu am putut valida adresa de email. Verifică formatul."],
    
    // Duplicate key errors
    [/duplicate key value violates unique constraint/i, "Această înregistrare există deja."],
    [/profiles_user_id_key/i, "Profilul tău există deja."],
    
    // Foreign key errors
    [/foreign key constraint/i, "Eroare de referință a datelor."],
    [/violates foreign key constraint/i, "Legătura cu datele asociate a eșuat."],
    
    // RLS errors
    [/row-level security/i, "Nu ai permisiunea să accesezi aceste date."],
    [/new row violates row-level security policy/i, "Nu ai permisiunea să creezi această înregistrare."],
    
    // Auth errors
    [/not authenticated/i, "Trebuie să fii autentificat pentru această acțiune."],
    [/JWT expired/i, "Sesiunea ta a expirat. Te rugăm să te autentifici din nou."],
    [/invalid JWT/i, "Sesiune invalidă. Te rugăm să te autentifici din nou."],
    [/Invalid login credentials/i, "Email sau parolă incorectă."],
    [/Email not confirmed/i, "Te rugăm să îți confirmi adresa de email."],
    [/already registered/i, "Acest email este deja înregistrat."],
    [/User not found/i, "Utilizatorul nu a fost găsit."],
    [/User already registered/i, "Acest email este deja înregistrat. Încerci să te autentifici?"],
    [/Email rate limit exceeded/i, "Prea multe încercări. Te rugăm să aștepți câteva minute."],
    [/same_password/i, "Noua parolă trebuie să fie diferită de parola actuală."],
    [/New password should be different/i, "Noua parolă trebuie să fie diferită de parola actuală."],
    [/recovery token/i, "Linkul de resetare este invalid sau a expirat."],
    [/otp.*expired/i, "Linkul de resetare a expirat. Te rugăm să soliciți un nou link."],
    [/For security purposes/i, "Din motive de securitate, te rugăm să aștepți înainte de a încerca din nou."],
    [/Signups not allowed/i, "Înregistrările nu sunt permise momentan."],
    
    // Network errors
    [/Failed to fetch/i, "Eroare de conexiune. Verifică conexiunea la internet."],
    [/NetworkError/i, "Eroare de rețea. Verifică conexiunea la internet."],
    [/connection/i, "Problemă de conexiune la server."],
    [/timeout/i, "Cererea a expirat. Te rugăm să încerci din nou."],
    
    // General errors
    [/internal server error/i, "Eroare internă a serverului. Te rugăm să încerci mai târziu."],
    [/service unavailable/i, "Serviciul este temporar indisponibil."],
  ];

  for (const [pattern, translation] of messagePatterns) {
    if (typeof pattern === "string" ? errorMessage.includes(pattern) : pattern.test(errorMessage)) {
      return translation;
    }
  }

  // Default fallback
  return "A apărut o eroare neprevăzută. Te rugăm să încerci din nou.";
}

/**
 * Get error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "";
}

/**
 * Get error code from Supabase errors
 */
function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("code" in error) return String((error as { code: unknown }).code);
  return null;
}

/**
 * Maps known Supabase/onboarding errors to user-friendly messages and recovery actions.
 * Ensures users are never trapped on error screens.
 */
export function handleOnboardingError(error: PostgrestError | Error | unknown): OnboardingErrorResult {
  const userMessage = translateSupabaseError(error);
  
  // Handle PostgrestError (Supabase errors)
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as PostgrestError;
    
    // Duplicate key constraint (profile already exists)
    if (pgError.code === "23505" || pgError.message?.includes("duplicate key value violates unique constraint")) {
      return {
        userMessage: "Profilul există deja. Te redirecționăm...",
        recovery: { type: "redirect", to: "/" },
        shouldBlock: false,
      };
    }
    
    // Foreign key constraint violation
    if (pgError.code === "23503") {
      return {
        userMessage: "Eroare de referință. Te rugăm să te autentifici din nou.",
        recovery: { type: "redirect", to: "/auth" },
        shouldBlock: false,
      };
    }
    
    // RLS policy violation
    if (pgError.code === "42501" || pgError.message?.includes("row-level security")) {
      return {
        userMessage: "Sesiune expirată. Te rugăm să te autentifici din nou.",
        recovery: { type: "redirect", to: "/auth" },
        shouldBlock: false,
      };
    }
    
    // Connection/network errors
    if (pgError.code === "PGRST301" || pgError.message?.includes("connection")) {
      return {
        userMessage: "Problemă de conexiune. Te rugăm să încerci din nou.",
        recovery: { type: "retry" },
        shouldBlock: false,
      };
    }
  }
  
  // Handle generic Error objects
  if (error instanceof Error) {
    // Network errors
    if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
      return {
        userMessage: "Problemă de conexiune. Te rugăm să încerci din nou.",
        recovery: { type: "retry" },
        shouldBlock: false,
      };
    }
    
    // Auth errors
    if (error.message?.includes("not authenticated") || error.message?.includes("JWT")) {
      return {
        userMessage: "Sesiune expirată. Te rugăm să te autentifici din nou.",
        recovery: { type: "redirect", to: "/auth" },
        shouldBlock: false,
      };
    }
  }
  
  // Default fallback - redirect to auth as safe recovery
  return {
    userMessage,
    recovery: { type: "redirect", to: "/auth" },
    shouldBlock: false,
  };
}

/**
 * Check if error is a duplicate profile error
 */
export function isDuplicateProfileError(error: PostgrestError | Error | unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as PostgrestError;
    return pgError.code === "23505" || 
           pgError.message?.includes("profiles_user_id_key") ||
           pgError.message?.includes("duplicate key value violates unique constraint");
  }
  return false;
}

/**
 * Translate auth-specific errors to Romanian
 */
export function translateAuthError(error: AuthError | Error | unknown): string {
  return translateSupabaseError(error);
}
