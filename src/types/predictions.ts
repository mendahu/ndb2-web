import { Endpoints } from "@offnominal/ndb2-api-types/v2";

export const isSortByOption = (
  val: unknown,
): val is Endpoints.Predictions.GET_Search.SortByOption =>
  typeof val === "string" &&
  Endpoints.Predictions.GET_Search.SORT_BY_VALUES.includes(
    val as Endpoints.Predictions.GET_Search.SortByOption,
  );
