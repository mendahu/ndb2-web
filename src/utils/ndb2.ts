import { Endpoints } from "@offnominal/ndb2-api-types/v2";
import { APIScores } from "@/types/scores";
import { RequestInit } from "next/dist/server/web/spec-extension/request";
import { responseHandler } from "./misc";
import { APIUsers } from "@/types/users";

const API_URL = process.env.NDB2_API_BASEURL;
const API_KEY = process.env.NDB2_API_KEY;

const baseUrl = API_URL || "http://localhost:8000";
const headers = new Headers({
  Authorization: `Bearer ${API_KEY}`,
  "content-type": "application/json",
});

export type GetLeaderboardOptions = RequestInit & {
  seasonIdentifier?: "current" | "last" | number;
};

export enum NDB2APIErrorCode {
  SERVER_ERROR = 90000,
  AUTHENTICATION_ERROR = 90001,
  BAD_REQUEST = 90002,
  MALFORMED_BODY_DATA = 90003,
  MALFORMED_QUERY_PARAMS = 90004,
  INVALID_PREDICTION_STATUS = 90201,
  INVALID_CHECK_DATE = 90202,
  BETS_NO_CHANGE = 90501,
  BETS_UNCHANGEABLE = 90502,
}

type NDB2Response = {
  success: boolean;
  errorCode: NDB2APIErrorCode;
  message: string | null;
  data: any;
};

const isNDB2Error = (body: any): body is NDB2Response => {
  if (typeof body !== "object") {
    return false;
  }

  if (
    !("success" in body) ||
    !("errorCode" in body) ||
    !("message" in body) ||
    !("data" in body)
  ) {
    return false;
  }

  const { success, errorCode, message } = body;

  if (
    typeof success !== "boolean" ||
    typeof errorCode !== "number" ||
    (typeof message !== "string" && message !== null)
  ) {
    return false;
  }

  return true;
};

const handleNDB2Error = (res: Response, body: any) => {
  if (res.status === 404) {
    return new Error("Resource Not Found");
  }

  if (!isNDB2Error(body) || !body.message) {
    return new Error(
      `Unexpected response from server, HTTP Status ${res.status}.`,
    );
  }

  switch (body.errorCode) {
    case NDB2APIErrorCode.AUTHENTICATION_ERROR:
      return new Error(`Authentication Error`);
    case NDB2APIErrorCode.BAD_REQUEST:
      return new Error(
        `Bad Request, HTTP Status ${res.status}. Server Message: ${body.message}`,
      );
    case NDB2APIErrorCode.MALFORMED_BODY_DATA:
      return new Error(
        `Malformed Body Data, HTTP Status ${res.status}. Server Message: ${body.message}`,
      );
    case NDB2APIErrorCode.MALFORMED_QUERY_PARAMS:
      return new Error(
        `Malformed Query Params, HTTP Status ${res.status}. Server Message: ${body.message}`,
      );
    case NDB2APIErrorCode.SERVER_ERROR:
      return new Error(
        `Server Error, HTTP Status ${res.status}. Server Message: ${body.message}`,
      );
    case NDB2APIErrorCode.INVALID_PREDICTION_STATUS:
      return new Error(
        `You can't perform this action on a prediction with this status.`,
      );
    case NDB2APIErrorCode.BETS_NO_CHANGE:
      return new Error(`You've already made this same bet.`);
    case NDB2APIErrorCode.BETS_UNCHANGEABLE:
      return new Error(
        `Bets cannot be changed once twelve hours have passed since the original bet.`,
      );
    default:
      return new Error(
        `Unexpected response from server, HTTP Status ${res.status}.`,
      );
  }
};

const errorHandler = (res: Response) => {
  if (!res.json) {
    throw new Error(
      `Unexpected response from server, HTTP Status ${res.status}.`,
    );
  }
  return res.json().then((body) => {
    throw handleNDB2Error(res, body);
  });
};

const getPointsLeaderboard = (
  options?: GetLeaderboardOptions,
): Promise<APIScores.GetPointsLeaderboard> => {
  let url: string = baseUrl + "/api/scores";
  if (options?.seasonIdentifier) {
    url += `/seasons/${options.seasonIdentifier}`;
  }
  url += "?view=points";

  return fetch(url, {
    headers,
    cache: options?.cache,
    next: options?.next,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const getBetsLeaderboard = (
  options?: GetLeaderboardOptions,
): Promise<APIScores.GetBetsLeaderboard> => {
  let url: string = baseUrl + "/api/scores";
  if (options?.seasonIdentifier) {
    url += `/seasons/${options.seasonIdentifier}`;
  }
  url += "?view=bets";

  return fetch(url, {
    headers,
    cache: options?.cache,
    next: options?.next,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const getPredictionsLeaderboard = (
  options?: GetLeaderboardOptions,
): Promise<APIScores.GetPredictionsLeaderboard> => {
  let url: string = baseUrl + "/api/scores";
  if (options?.seasonIdentifier) {
    url += `/seasons/${options.seasonIdentifier}`;
  }
  url += "?view=predictions";

  return fetch(url, {
    headers,
    cache: options?.cache,
    next: options?.next,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const getPredictionById = (
  id: number,
  options?: RequestInit,
): Promise<Endpoints.Predictions.GET_ById.Response> => {
  return fetch(baseUrl + `/api/v2/predictions/${id}`, {
    headers,
    ...options,
  })
    .then((res) => res.json())
    .catch(errorHandler);
};

const searchPredictions = (
  options: Endpoints.Predictions.GET_Search.Query,
): Promise<Endpoints.Predictions.GET_Search.Response> => {
  const url = new URL(`/api/v2/predictions/search`, baseUrl);
  url.search =
    Endpoints.Predictions.GET_Search.toURLSearchParams(options).toString();

  return fetch(url, {
    headers,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const getUserBetsByDiscordId = (
  discordId: string,
): Promise<APIUsers.GetUserBetsByDiscordId> => {
  return fetch(baseUrl + `/api/users/discord_id/${discordId}/bets`, {
    headers,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const getSeasons = (): Promise<Endpoints.Seasons.GET.Response> => {
  return fetch(baseUrl + `/api/v2/seasons`, {
    headers,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const addBet = (
  predictionId: number,
  endorsed: boolean,
  discord_id: string,
): Promise<Endpoints.Predictions.POST_ById_bets.Response> => {
  const body = {
    endorsed,
    discord_id,
  };
  return fetch(baseUrl + `/api/v2/predictions/${predictionId}/bets`, {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  })
    .then(responseHandler)
    .catch(errorHandler);
};

const ndb2API = {
  getPointsLeaderboard,
  getBetsLeaderboard,
  getPredictionsLeaderboard,
  getPredictionById,
  searchPredictions,
  getUserBetsByDiscordId,
  getSeasons,
  addBet,
};

export default ndb2API;
