export interface UserAccount {
  id: string;
  email: string;
  name: string;
  area?: string;
  funcao?: string;
  superiorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  area?: string;
  funcao?: string;
  superiorEmail?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  area?: string;
  funcao?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
}
