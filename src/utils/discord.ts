import { APIAuth } from "@/types/user";
import {
  APIGuildMember,
  RESTError,
  RESTGetAPIGuildMemberResult,
} from "discord-api-types/v10";
import { responseHandler } from "./misc";
import { ShortDiscordGuildMember } from "@/types/discord";
import envVars, { ALLOWED_ROLES } from "@/config";

const REDIRECT_URI = `${envVars.APP_URL}/api/auth/oauth`;
const GUILD_ID = envVars.DISCORD_GUILD_ID;

const isDiscordAPIError = (err: any): err is RESTError => {
  if (typeof err !== "object") {
    return false;
  }

  if (!("code" in err) || !("message" in err)) {
    return false;
  }

  return true;
};

const handleDiscordError = (res: Response, body: any) => {
  if (!isDiscordAPIError(body)) {
    if (res.status) {
      return new Error(
        `Received an error from the Discord API but it is not recognized:\n- HTTP: ${res.status}\n- Message: ${res.statusText}`,
      );
    } else {
      return new Error(
        "Something went wrong with the Discord API call, but we don't recognize the error.",
      );
    }
  }

  return new Error(
    `Discord API Error:\n- HTTP: ${res.status}\n- Message: ${body.message}\n- Error Code: ${body.code}`,
  );
};

const errorHandler = (res: Response) => {
  return res.json().then((body) => {
    throw handleDiscordError(res, body);
  });
};

const buildDiscordOAuthUrl = (options: {
  baseUrl: string;
  clientId: string;
  scope: string[];
  redirectUri: string;
  state: string;
}): string => {
  return `${options.baseUrl}/oauth2/authorize?response_type=code&client_id=${
    options.clientId
  }&scope=${encodeURIComponent(
    options.scope.join(" "),
  )}&redirect_uri=${encodeURIComponent(
    options.redirectUri,
  )}&prompt=consent&state=${options.state}`;
};

export const buildAvatarUrl = (
  userId: string,
  hash: string | null | undefined,
  fallbackHash: string | null,
  discriminator: number,
): string => {
  if (hash) {
    return `${envVars.DISCORD_CDN_BASE_URL}/guilds/${GUILD_ID}/users/${userId}/avatars/${hash}.png`;
  }

  if (fallbackHash) {
    return `${envVars.DISCORD_CDN_BASE_URL}/avatars/${userId}/${fallbackHash}.png`;
  }

  return `${envVars.DISCORD_CDN_BASE_URL}/embed/avatars/${
    discriminator % 5
  }.png`;
};

export const hasCorrectRole = (roles: string[]): boolean => {
  for (const role of roles) {
    if (ALLOWED_ROLES.has(role)) {
      return true;
    }
  }
  return false;
};

const baseUrl = envVars.DISCORD_API_BASE_URL;
const scope = ["identify", "guilds", "guilds.members.read"];

const authenticate = (
  code: string,
): Promise<{
  access_token: string;
  token_type: string;
}> => {
  const body = new URLSearchParams({
    client_id: envVars.DISCORD_CLIENT_ID,
    client_secret: envVars.DISCORD_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
    code,
    scope: scope.join(" "),
  }).toString();

  return fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const identify = (
  access_token: string,
): Promise<RESTGetAPIGuildMemberResult> => {
  return fetch(`${baseUrl}/users/@me/guilds/${GUILD_ID}/member`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const authorize = (
  member: APIGuildMember,
): {
  user: APIAuth.User | null;
  error: string | null;
} => {
  if (!hasCorrectRole(member.roles)) {
    return { user: null, error: "Incorrect role" };
  }

  if (!member.user) {
    return { user: null, error: "Missing Member information" };
  }

  const user = {
    name: member.nick || member.user?.username || "Unknown User",
    avatarUrl: buildAvatarUrl(
      member.user.id,
      member.avatar,
      member.user.avatar,
      Number(member.user.discriminator),
    ),
    discordId: member.user?.id,
  };

  return { user, error: null };
};

const getGuildMembers = () => {
  return fetch(`${baseUrl}/guilds/${GUILD_ID}/members?limit=1000`, {
    headers: { Authorization: `Bot ${envVars.DISCORD_BOT_TOKEN}` },
    next: {
      revalidate: 86400,
    },
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const getGuildMemberByDiscordId = (discordId: string) => {
  return fetch(`${baseUrl}/guilds/${GUILD_ID}/members/${discordId}`, {
    headers: { Authorization: `Bot ${envVars.DISCORD_BOT_TOKEN}` },
    next: {
      revalidate: 86400,
    },
  })
    .then((res) => {
      return res.json().then((body) => {
        const data: [any, Response] = [body, res];
        return data;
      });
    })
    .then(([body, res]) => {
      if (res.ok) {
        return body;
      }

      if (res.status === 404 && "code" in body) {
        const fakeUser = {
          user: {
            id: discordId,
            discriminator: "0000",
          },
        };
        return fakeUser;
      } else {
        return body;
      }
    })
    .catch(errorHandler);
};

export class GuildMemberManager {
  private members: Record<string, ShortDiscordGuildMember> = {};

  public initialize = (): Promise<void> => {
    return getGuildMembers().then((members) => {
      for (const member of members) {
        if (!hasCorrectRole(member.roles)) {
          continue;
        }

        this.members[member.user.id] = {
          name: member.nick || member.user.username || "Unknown User",
          avatarUrl: buildAvatarUrl(
            member.user.id,
            member.avatar,
            member.user.avatar,
            Number(member.user?.discriminator),
          ),
          discordId: member.user.id,
        };
      }
    });
  };

  public getMembers = (): Record<string, ShortDiscordGuildMember> => {
    return this.members;
  };

  public getMemberByDiscordId = (
    discordId: string,
  ): Promise<ShortDiscordGuildMember> => {
    if (this.members[discordId]) {
      return Promise.resolve(this.members[discordId]);
    } else {
      return getGuildMemberByDiscordId(discordId).then((member) => {
        this.members[discordId] = {
          name: member.nick || member.user?.username || "Unknown User",
          avatarUrl: buildAvatarUrl(
            member.user.id,
            member.avatar,
            member.user.avatar,
            Number(member.user.discriminator),
          ),
          discordId: member.user.id,
        };
        return this.members[discordId];
      });
    }
  };

  public buildUserLookup = (
    discordIds: string[],
  ): Promise<Record<string, ShortDiscordGuildMember>> => {
    const usersPromises = discordIds.map((discordId) =>
      this.getMemberByDiscordId(discordId),
    );
    const userLookup: Record<string, ShortDiscordGuildMember> = {};

    return Promise.all(usersPromises).then((users) => {
      for (const user of users) {
        userLookup[user.discordId] = user;
      }
      return userLookup;
    });
  };
}

const getOAuthUrl = (state: string): string => {
  return buildDiscordOAuthUrl({
    baseUrl,
    clientId: envVars.DISCORD_CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scope,
    state,
  });
};

const discordAPI = {
  authenticate,
  identify,
  authorize,
  GuildMemberManager,
  getOAuthUrl,
};

export default discordAPI;
