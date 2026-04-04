import { useUserContext } from "../contexts/UserContext";

/**
 * Custom hook to consume the centralized user authentication and role-based state.
 * 
 * Instead of each component setting up its own session listener and role-fetching
 * logic, this hook now consumes values from the UserProvider at the root of the app.
 * 
 * @returns An object containing:
 * - user: The current Supabase user object or null
 * - userRole: The role of the user ('admin' | 'employee')
 * - loading: Boolean indicating if auth state is still being determined
 * - signOut: Helper function to securely sign out the user
 */ 
export function useUser() {
    return useUserContext();
}
