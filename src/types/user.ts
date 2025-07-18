export type UserRole = 'admin' | 'captain' | 'office';

export interface User {
  id: string;
  username: string;
  password: string; // This is the hashed password
  name: string;
  role: UserRole;
  createdat: string;
  updatedat: string;
  isactive: boolean;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  username?: string;
  password?: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserLoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}