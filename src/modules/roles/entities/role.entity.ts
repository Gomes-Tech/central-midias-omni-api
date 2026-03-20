export interface Role {
  id: string;
  label: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
