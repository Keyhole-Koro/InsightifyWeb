import { projectClient } from "@/rpc/clients";
import {
  type CreateProjectRequest,
  type CreateProjectResponse,
  type EnsureProjectRequest,
  type EnsureProjectResponse,
  type ListProjectsRequest,
  type ListProjectsResponse,
  type SelectProjectRequest,
  type SelectProjectResponse,
  type ProjectItem,
} from "@/contracts/project";

export { projectClient };
export type { CreateProjectRequest, CreateProjectResponse, EnsureProjectRequest, EnsureProjectResponse, ListProjectsRequest, ListProjectsResponse, SelectProjectRequest, SelectProjectResponse, ProjectItem };

export const createProject = async (req: CreateProjectRequest): Promise<CreateProjectResponse> => {
    return await projectClient.createProject(req);
};

export const listProjects = async (req: ListProjectsRequest): Promise<ListProjectsResponse> => {
    return await projectClient.listProjects(req);
};

export const selectProject = async (req: SelectProjectRequest): Promise<SelectProjectResponse> => {
    return await projectClient.selectProject(req);
};

export const ensureProject = async (req: EnsureProjectRequest): Promise<EnsureProjectResponse> => {
    return await projectClient.ensureProject(req);
};
