export interface InitRunRequest {
  userId: string;
  projectId?: string;
}

export interface InitRunResponse {
  projectId?: string;
}

export interface Project {
  projectId: string;
  userId: string;
  name: string;
  isActive?: boolean;
}

// Backward-compatible alias for existing feature code.
export type ProjectItem = Project;

export interface ListProjectsRequest {
  userId: string;
}

export interface ListProjectsResponse {
  projects?: Project[];
  activeProjectId?: string;
}

export interface CreateProjectRequest {
  userId: string;
  name?: string;
}

export interface CreateProjectResponse {
  project?: Project;
}

export interface SelectProjectRequest {
  userId: string;
  projectId: string;
}

export interface SelectProjectResponse {
  project?: Project;
}
