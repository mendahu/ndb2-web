import { APIResponse } from "./api";

export namespace APIUsers {
  export type UserBet = {
    id: string;
    endorsed: boolean;
    date: string;
    wager: number;
    valid: boolean;
    payout: number;
    season_payout: number;
    better: {
      id: string;
      discord_id: string;
    };
    prediction_id: number;
  };

  export type GetUserBetsByDiscordId = APIResponse<UserBet[]>;
}
