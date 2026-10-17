import { WorkOS } from "@workos-inc/node";
import { config } from "@/nextsignal/config";

export type WorkOSUserProfile = {
  id: string;
  email: string;
  displayName: string;
};

let workos: WorkOS | undefined;

export const workosService = {
  async getUserProfile(userId: string): Promise<WorkOSUserProfile> {
    const user = await getWorkOS().userManagement.getUser(userId);
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

    return {
      id: user.id,
      email: user.email,
      displayName: displayName || user.email || user.id
    };
  }
};

function getWorkOS() {
  const apiKey = config.require<string>("workos.apikey");
  workos ??= new WorkOS(apiKey);
  return workos;
}
