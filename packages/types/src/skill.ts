export interface Skill {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  instructions: string;
  isSystem: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillDto {
  name: string;
  description?: string;
  category?: string;
  instructions: string;
}

export interface UpdateSkillDto {
  name?: string;
  description?: string;
  category?: string;
  instructions?: string;
}
