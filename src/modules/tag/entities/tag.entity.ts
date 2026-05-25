export interface TagEntity {
  id: string;
  organizationId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  materialsCount: number;
  tagSearchesCount: number;
}
