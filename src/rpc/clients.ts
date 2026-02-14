import { createClient } from "@connectrpc/connect";
import { transport } from "./transport";
import { ProjectService } from "@/gen/insightify/v1/project_pb";
import { RunService } from "@/gen/insightify/v1/run_pb";
import { UserInteractionService } from "@/gen/insightify/v1/user_interaction_pb";

export const projectClient: any = createClient(ProjectService as any, transport);
export const runClient: any = createClient(RunService as any, transport);
export const interactionClient: any = createClient(UserInteractionService as any, transport);
