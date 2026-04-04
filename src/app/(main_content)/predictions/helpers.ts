import { Entities } from "@offnominal/ndb2-api-types/v2";

export const statusLabel: Record<
  Entities.Predictions.PredictionLifeCycle,
  string
> = {
  open: "Open",
  closed: "Closed",
  retired: "Retired",
  successful: "Success",
  failed: "Failed",
  checking: "Open",
};
