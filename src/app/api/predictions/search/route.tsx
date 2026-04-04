import { NextResponse } from "next/server";
import authAPI from "@/utils/auth";
import { isSortByOption } from "@/types/predictions";
import { Entities, Endpoints } from "@offnominal/ndb2-api-types/v2";
import ndb2API from "@/utils/ndb2";
import { cookies } from "next/headers";

const isPredictionLifeCycle = (
  val: unknown
): val is Entities.Predictions.PredictionLifeCycle =>
  typeof val === "string" &&
  (Entities.Predictions.PREDICTION_LIFECYCLE_VALUES as readonly string[]).includes(
    val
  );

export async function GET(req: Request) {
  const token = cookies().get("token");
  const payload = await authAPI.verify(token);

  if (!payload) {
    return NextResponse.redirect("/signin");
  }

  const { searchParams } = new URL(req.url);
  const statusesStrings = searchParams.getAll("status");
  const sort_byString = searchParams.get("sort_by");
  const keyword = searchParams.get("keyword");
  const creator = searchParams.get("creator");
  const unbetter = searchParams.get("unbetter");
  const season_id = searchParams.get("season_id");
  const pageString = searchParams.get("page");

  const page = pageString ? Number(pageString) : undefined;

  if (page && isNaN(page)) {
    return NextResponse.json(
      { error: "Page number must be a number" },
      { status: 400 }
    );
  }

  if (season_id && isNaN(Number(season_id))) {
    return NextResponse.json(
      { error: "Season ID must be a number" },
      { status: 400 }
    );
  }

  let statuses: Entities.Predictions.PredictionLifeCycle[] | undefined;

  if (statusesStrings.length > 0) {
    statuses = [];

    for (const status of statusesStrings) {
      if (!isPredictionLifeCycle(status)) {
        return NextResponse.json(
          { error: `Invalid status: ${status}` },
          { status: 400 }
        );
      }

      statuses.push(status);
    }
  }

  let sort_by: Endpoints.Predictions.GET_Search.SortByOption | undefined;

  if (sort_byString) {
    if (isSortByOption(sort_byString)) {
      sort_by = sort_byString;
    } else {
      return NextResponse.json(
        { error: `Invalid sort_by option: ${sort_byString}` },
        { status: 400 }
      );
    }
  }

  return ndb2API
    .searchPredictions({
      keyword: keyword || undefined,
      page: page || undefined,
      status: statuses?.length ? statuses : undefined,
      sort_by,
      creator: creator || undefined,
      unbetter: unbetter || undefined,
      season_id: season_id ? Number(season_id) : undefined,
    })
    .then((data) => NextResponse.json(data.data))
    .catch((err) => {
      console.error(err);
      return NextResponse.json(
        { error: `Error fetching predictions: ${err}` },
        { status: 500 }
      );
    });
}
