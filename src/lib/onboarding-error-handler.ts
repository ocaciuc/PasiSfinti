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

  // Check for PostgreSQL error code
  if (errorCode && pgErrorMap[errorCode]) {
    return pgErrorMap[errorCode];
  }

  // Message pattern matching for Romanian translation
  const messagePatterns: Array<[RegExp | string, string]> = [
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
    [/Password should be at least/i, "Parola trebuie să aibă cel puțin 6 caractere."],
    [/Email rate limit exceeded/i, "Prea multe încercări. Te rugăm să aștepți câteva minute."],
    [/For security purposes/i, "Din motive de securitate, te rugăm să aștepți înainte de a încerca din nou."],
    
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
