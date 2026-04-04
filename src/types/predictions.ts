import { Entities, Endpoints } from "@offnominal/ndb2-api-types/v2";
import { APIBets } from "./bets";

export const isSortByOption = (
  val: unknown,
): val is Endpoints.Predictions.GET_Search.SortByOption =>
  typeof val === "string" &&
  Endpoints.Predictions.GET_Search.SORT_BY_VALUES.includes(
    val as Endpoints.Predictions.GET_Search.SortByOption,
  );

export namespace APIPredictions {
  export type Vote = {
    id: string;
    vote: boolean;
    voted_date: string;
    voter: {
      id: string;
      discord_id: string;
    };
  };

  type EventDrivenPrediction = {
    driver: "event";
    check_date: string;
  };

  type DateDrivenPrediction = {
    driver: "date";
    due_date: string;
  };

  type EnhancedPredictionBase = {
    id: number;
    predictor: {
      id: string;
      discord_id: string;
    };
    text: string;
    season_id: number;
    created_date: string;
    closed_date: string | null;
    triggered_date: string | null;
    triggerer: {
      id: string;
      discord_id: string;
    } | null;
    judged_date: string | null;
    retired_date: string | null;
    status: Entities.Predictions.PredictionLifeCycle;
    bets: APIBets.Bet[];
    votes: Vote[];
    payouts: {
      endorse: number;
      undorse: number;
    };
  };

  export type EnhancedPrediction =
    | (EventDrivenPrediction & EnhancedPredictionBase)
    | (DateDrivenPrediction & EnhancedPredictionBase);
}
