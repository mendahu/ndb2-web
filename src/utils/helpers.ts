import { Entities } from "@offnominal/ndb2-api-types/v2";
import { format } from "date-fns";

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
};

export type TimelineItemType = {
  label: string;
  value: string;
  status:
    | "complete"
    | "complete_negative"
    | "in_progress"
    | "not_started"
    | "cancelled";
};

interface BuildTimelinePropsBase {
  created_date: string;
  status: Entities.Predictions.PredictionLifeCycle;
  retired_date: string | null;
  triggered_date: string | null;
  judged_date: string | null;
  closed_date: string | null;
}

export interface EventDrivenTimelineProps extends BuildTimelinePropsBase {
  driver: Extract<Entities.Predictions.PredictionDriver, "event">;
  check_date: string;
  due_date: null;
}

export interface DateDrivenTimelineProps extends BuildTimelinePropsBase {
  driver: Extract<Entities.Predictions.PredictionDriver, "date">;
  due_date: string;
  check_date: null;
}

export const buildTimeline = ({
  created_date,
  status,
  driver,
  check_date,
  due_date,
  retired_date,
  triggered_date,
  judged_date,
  closed_date,
}: EventDrivenTimelineProps | DateDrivenTimelineProps): [
  TimelineItemType,
  TimelineItemType,
  TimelineItemType,
  TimelineItemType,
] => {
  const dateFormat = "MMM do, yyyy";

  const createdDate = new Date(created_date);

  const item1: TimelineItemType = {
    label: "Created",
    value: format(createdDate, dateFormat),
    status: "complete",
  };

  let item2: TimelineItemType = {
    label: "",
    value: "",
    status: "not_started",
  };

  if (status === "open" || status === "checking") {
    if (driver === "event") {
      const checkDate = new Date(check_date);
      item2 = {
        label: "Will Check",
        value: format(checkDate, dateFormat),
        status: "in_progress",
      };
    } else if (driver === "date") {
      const dueDate = new Date(due_date);
      item2 = {
        label: "Due",
        value: format(dueDate, dateFormat),
        status: "in_progress",
      };
    }
  } else if (status === "retired" && retired_date) {
    const retiredDate = new Date(retired_date);
    item2 = {
      label: "Retired",
      value: format(retiredDate, dateFormat),
      status: "complete_negative",
    };
  } else if (triggered_date) {
    const triggeredDate = new Date(triggered_date);
    item2 = {
      label: "Triggered",
      value: triggeredDate ? format(triggeredDate, dateFormat) : "",
      status: "complete",
    };
  }

  let item3: TimelineItemType = {
    label: "",
    value: "",
    status: "not_started",
  };

  if (status === "open" || status === "checking") {
    item3 = {
      label: "Close",
      value: "",
      status: "not_started",
    };
  } else if (status === "retired") {
    if (driver === "event") {
      const checkDate = new Date(check_date);
      item3 = {
        label: "Check",
        value: format(checkDate, dateFormat),
        status: "cancelled",
      };
    } else {
      const dueDate = new Date(due_date);
      item3 = {
        label: "Due",
        value: format(dueDate, dateFormat),
        status: "cancelled",
      };
    }
  } else if (closed_date) {
    const closedDate = new Date(closed_date);
    item3 = {
      label: "Eff. Close",
      value: closedDate ? format(closedDate, dateFormat) : "",
      status: "complete",
    };
  }

  let item4: TimelineItemType = {
    label: "",
    value: "",
    status: "not_started",
  };

  if (status === "open" || status === "checking") {
    item4 = {
      label: "Judgement",
      value: "",
      status: "not_started",
    };
  } else if (status === "retired") {
    item4 = {
      label: "Judgement",
      value: "",
      status: "cancelled",
    };
  } else if (judged_date) {
    const judgedDate = new Date(judged_date);

    if (status === "failed") {
      item4 = {
        label: "Judgement",
        value: judgedDate ? format(judgedDate, dateFormat) : "",
        status: "complete_negative",
      };
    } else if (status === "successful") {
      item4 = {
        label: "Judged",
        value: judgedDate ? format(judgedDate, dateFormat) : "",
        status: "complete",
      };
    }
  }

  return [item1, item2, item3, item4];
};

export const getURLSearchParams = (searchParams: {
  [key: string]: string | string[] | undefined;
}): URLSearchParams => {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, Array.isArray(value) ? value.join(",") : value);
    }
  });

  return params;
};

export const generateURIComponent = (
  path: string,
  queryString: string,
): string => {
  const uriComponent = path + (queryString ? "?" + queryString : "");
  return encodeURIComponent(uriComponent);
};
