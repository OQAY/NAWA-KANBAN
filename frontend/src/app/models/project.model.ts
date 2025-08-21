// NASA STANDARD: Project model < 60 lines, functional focus
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProjectRequest {
  readonly name: string;
  readonly description: string;
}

export interface UpdateProjectRequest {
  readonly name?: string;
  readonly description?: string;
}

// Simple validation - no fancy stuff
export function isValidProject(obj: any): obj is Project {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.ownerId === 'string';
}