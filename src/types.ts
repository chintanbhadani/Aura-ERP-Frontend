export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface BaseState {
  token: string | null;
  user: User | null;
}
