export interface Project {
  id: string;
  name: string;
  active: boolean;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  email: string;
  name: string;
  managerEmail?: string;
  managerName?: string;
  emailSignature?: string;
  emailSignatureImage?: string;
  emailSignatureImageMime?: string;
  horasContratadasMes?: number;
  horasContratadasDia?: number;
}

export interface UserSettingsResponse extends UserSettings {
  isManager: boolean;
  hasPassword: boolean;
  subordinates: { id: string; email: string; name: string }[];
}
