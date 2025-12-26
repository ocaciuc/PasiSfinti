import { PostgrestError } from "@supabase/supabase-js";

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
 * Maps known Supabase/onboarding errors to user-friendly messages and recovery actions.
 * Ensures users are never trapped on error screens.
 */
export function handleOnboardingError(error: PostgrestError | Error | unknown): OnboardingErrorResult {
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
    userMessage: "A apărut o eroare neprevăzută. Te redirecționăm...",
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
