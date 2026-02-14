import { projectClient } from "@/rpc/clients";
import { type CreateProjectRequest, type CreateProjectResponse, type ListProjectsRequest, type ListProjectsResponse, type SelectProjectRequest, type SelectProjectResponse, type ProjectItem } from "@/shared/types/core";

export { projectClient };
export type { CreateProjectRequest, CreateProjectResponse, ListProjectsRequest, ListProjectsResponse, SelectProjectRequest, SelectProjectResponse, ProjectItem };

export const createProject = async (req: CreateProjectRequest): Promise<CreateProjectResponse> => {
    return await projectClient.createProject(req);
};

export const listProjects = async (req: ListProjectsRequest): Promise<ListProjectsResponse> => {
    return await projectClient.listProjects(req);
};

export const selectProject = async (req: SelectProjectRequest): Promise<SelectProjectResponse> => {
    return await projectClient.selectProject(req);
};
