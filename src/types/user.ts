export type UserRole = 'admin' | 'captain' | 'office';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
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