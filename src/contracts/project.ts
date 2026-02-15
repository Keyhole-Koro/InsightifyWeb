export interface EnsureProjectRequest {
  userId: string;
  projectId?: string;
}

export interface EnsureProjectResponse {
  projectId?: string;
}

export interface Project {
  projectId: string;
  userId: string;
  name: string;
  isActive?: boolean;
}

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
