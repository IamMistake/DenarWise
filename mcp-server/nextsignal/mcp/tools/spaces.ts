import { z } from "zod";
import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import type { SpacesLeaveInput, SpacesListInput, SpacesListMembersInput } from "@/nextsignal/schemas";

const spaceIdSchema = z.string().min(1);

export const spaceTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      server.registerTool(
        "space_list",
        {
          title: "List Spaces",
          description: "Lists home spaces the authenticated user has joined. Use a returned id as spaceId for shopping and member tools.",
          inputSchema: {}
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<SpacesListInput>(app, "spaces.list", input, extra))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "space_list_members",
        {
          title: "List Space Members",
          description: "Lists members in the requested home space.",
          inputSchema: {
            spaceId: spaceIdSchema
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<SpacesListMembersInput>(app, "spaces.listMembers", input, extra))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "space_leave",
        {
          title: "Leave Space",
          description: "Leaves a home space. If the space has no members afterward, it and its home data are deleted.",
          inputSchema: {
            spaceId: spaceIdSchema
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<SpacesLeaveInput>(app, "spaces.leave", input, extra))
      );
    }
  }
];
