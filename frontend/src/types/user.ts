// Copied from backend src/types/user.ts for frontend use

export type UserRole = 'admin' | 'captain' | 'office';

// Define the User structure expected by the frontend (excluding password)
export interface User {
  id: string;
  username: string;
  // password field is intentionally omitted for frontend use
  name: string;
  role: UserRole;
  createdAt: string; // Use string for simplicity in frontend state
  updatedAt: string; // Use string for simplicity in frontend state
  isActive: boolean;
}

// DTO for login payload
export interface UserLoginDTO {
  username: string;
  password: string;
}

// Structure of the response from the /api/auth/login endpoint
export interface AuthResponse {
  token: string;
  user: User; // Use the frontend User type (without password)
}
