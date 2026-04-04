import { APIBets } from "@/types/bets";
import { Entities, Endpoints } from "@offnominal/ndb2-api-types/v2";
import { APIPredictions } from "@/types/predictions";
import { responseHandler } from "@/utils/misc";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const findStatus = (
  status: Entities.Predictions.PredictionLifeCycle,
  statuses: Entities.Predictions.PredictionLifeCycle[],
): boolean => {
  return statuses.find((s) => s === status) !== undefined;
};

const allStatuses = (
  statuses: Entities.Predictions.PredictionLifeCycle[],
): boolean => {
  return statuses.length === 5 || statuses.length === 0;
};

const search = (
  options: Endpoints.Predictions.GET_Search.Query,
): Promise<Endpoints.Predictions.GET_Search.Data> => {
  const params = Endpoints.Predictions.GET_Search.toURLSearchParams(options);
  return fetch("/api/predictions/search?" + params.toString()).then(
    responseHandler,
  );
};

export const usePredictionSearch = (
  discordId: string,
  bets: APIBets.UserBet[],
) => {
  const [predictions, setPredictions] = useState<
    Entities.Predictions.PredictionSearchResult[]
  >([]);

  const [userBets, setUserBets] = useState<APIBets.UserBet[]>(bets);

  const updateUserBet = useCallback(
    (predictionId: number, endorsed: boolean) => {
      return fetch("/api/predictions/" + predictionId + "/bets", {
        method: "POST",
        body: JSON.stringify({ discord_id: discordId, endorsed }),
      })
        .then((res) => {
          return res.json().then((response) => {
            if (res.ok) {
              return response;
            } else {
              throw response.error;
            }
          });
        })
        .then((prediction: APIPredictions.EnhancedPrediction) => {
          // update user bets state
          const newBets = [...userBets];
          const existingBetIndex = userBets.findIndex(
            (b) => b.prediction_id === predictionId,
          );
          if (existingBetIndex >= 0) {
            const updatedBet = { ...newBets[existingBetIndex], endorsed };
            newBets[existingBetIndex] = updatedBet;
            setUserBets(newBets);
          } else {
            const newBet = prediction.bets.find(
              (b) => b.better.discord_id === discordId,
            );
            if (newBet) {
              setUserBets([
                ...newBets,
                { ...newBet, prediction_id: prediction.id },
              ]);
            }
          }

          // update prediction state
          const existingPredictionIndex = predictions.findIndex(
            (p) => p.id === predictionId,
          );
          if (existingPredictionIndex >= 0) {
            const newPredictions = [...predictions];
            const existingPrediction = newPredictions[existingPredictionIndex];
            newPredictions[existingPredictionIndex] = {
              ...existingPrediction,
              bets: {
                endorsements: prediction.bets.filter(
                  (b) => b.endorsed && b.valid,
                ).length,
                undorsements: prediction.bets.filter(
                  (b) => !b.endorsed && b.valid,
                ).length,
                invalid: prediction.bets.filter((b) => !b.valid).length,
              },
              votes: {
                yes: prediction.votes.filter((v) => v.vote).length,
                no: prediction.votes.filter((v) => !v.vote).length,
              },
            };
            setPredictions(newPredictions);
          }
        });
    },
    [discordId, userBets, predictions],
  );

  // loading states
  const [searching, setSearching] = useState(false);
  const [incrementallySearching, setIncrementallySearching] = useState(false);
  const [reachedEndOfList, setReachedEndOfList] = useState(false);

  const searchParams = useSearchParams();

  // Initial search params
  const initialParams = {
    predictorId: searchParams.get("creator") || undefined,
    keyword: searchParams.get("keyword") || "",
    statuses: searchParams.getAll(
      "status",
    ) as Entities.Predictions.PredictionLifeCycle[],
    sort_by:
      (searchParams.get(
        "sort_by",
      ) as Endpoints.Predictions.GET_Search.SortByOption) || "due_date-asc",
    season_id: searchParams.get("season_id") || undefined,
    showBetOpportunities: searchParams.get("unbetter") !== null,
  };

  // Search Params States
  const [page, setPage] = useState(1);
  const [predictor_id, setPredictorId] = useState<string | undefined>(
    initialParams.predictorId,
  );
  const [keyword, setKeyword] = useState(initialParams.keyword);
  const [statuses, setStatuses] = useState<
    Entities.Predictions.PredictionLifeCycle[]
  >(initialParams.statuses);
  const [sort_by, setSortBy] =
    useState<Endpoints.Predictions.GET_Search.SortByOption>(
      initialParams.sort_by,
    );
  const [season_id, setSeasonId] = useState<string | undefined>(
    initialParams.season_id,
  );
  const [showBetOpportunities, setShowBetOpportunities] = useState(
    initialParams.showBetOpportunities,
  );

  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>();
  const keywordRef = useRef(keyword);

  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (keyword) {
      params.set("keyword", keyword);
    } else {
      params.delete("keyword");
    }

    params.delete("status");
    for (const status of statuses) {
      params.append("status", status);

      if (status === "open") {
        params.append("status", "checking");
      }
    }

    params.set("sort_by", sort_by);

    if (predictor_id) {
      params.set("creator", predictor_id);
    } else {
      params.delete("creator");
    }

    if (season_id) {
      params.set("season_id", season_id);
    } else {
      params.delete("season_id");
    }

    if (showBetOpportunities) {
      params.set("unbetter", discordId);
    } else {
      params.delete("unbetter");
    }

    history.replaceState(history.state, "", `${pathname}?${params.toString()}`);
  }, [
    pathname,
    searchParams,
    keyword,
    statuses,
    sort_by,
    predictor_id,
    showBetOpportunities,
    season_id,
    discordId,
  ]);

  const incrementPage = useCallback(() => {
    if (reachedEndOfList) {
      return;
    }
    setPage((prev) => prev + 1);
  }, [reachedEndOfList]);

  const handleSearch = useCallback(
    (options: Endpoints.Predictions.GET_Search.Query) => {
      setSearching(true);
      search(options)
        .then((preds) => {
          if (preds.length < 10) {
            setReachedEndOfList(true);
          }
          setPredictions((prev) => {
            if (page === 1) {
              return preds;
            } else {
              return [...prev, ...preds];
            }
          });
        })
        .catch((err) => console.error(err))
        .finally(() => {
          setSearching(false);
        });
    },
    [page],
  );

  useEffect(() => {
    const options: Endpoints.Predictions.GET_Search.Query = {
      keyword: keyword || undefined,
      page,
      status: statuses.length ? statuses : undefined,
      sort_by,
      creator: predictor_id || undefined,
      season_id: season_id ? Number(season_id) : undefined,
      unbetter: showBetOpportunities ? discordId : undefined,
    };

    if (reachedEndOfList) {
      return;
    }

    if (keywordRef.current !== keyword) {
      keywordRef.current = keyword;
      clearTimeout(timeout.current);

      timeout.current = setTimeout(() => {
        handleSearch(options);
      }, 500);
    } else {
      handleSearch(options);
    }
  }, [
    keyword,
    statuses,
    sort_by,
    page,
    predictor_id,
    showBetOpportunities,
    discordId,
    season_id,
    handleSearch,
    reachedEndOfList,
  ]);

  const setStatus = useCallback(
    (
      newStatus: Entities.Predictions.PredictionLifeCycle | "all",
      value: boolean,
    ) => {
      const newStatuses: Entities.Predictions.PredictionLifeCycle[] = [];

      if (newStatus === "all") {
        return setStatuses(newStatuses);
      }

      let found = false;

      for (const status of statuses) {
        if (status !== newStatus) {
          newStatuses.push(status);

          continue;
        }

        found = true;

        if (value) {
          newStatuses.push(status);
        }
      }

      if (!found) {
        newStatuses.push(newStatus);
      }

      setStatuses(newStatuses);
    },
    [statuses],
  );

  const resetPages = useCallback(() => {
    setPage(1);
    setReachedEndOfList(false);
  }, []);

  const clearFilters = useCallback(() => {
    setKeyword("");
    setStatus("all", true);
    setSortBy("due_date-asc");
    setPredictorId("");
    setShowBetOpportunities(false);
    setSeasonId(undefined);
    resetPages();
  }, [setStatus, resetPages]);

  return {
    predictions: predictions.map((p) => ({
      ...p,
      userBet: userBets.find((b) => b.prediction_id === p.id) || false,
    })),
    updateUserBet,
    userBets,
    searching,
    incrementallySearching,
    statuses: {
      all: allStatuses(statuses),
      open: findStatus("open", statuses),
      checking: findStatus("checking", statuses),
      closed: findStatus("closed", statuses),
      retired: findStatus("retired", statuses),
      successful: findStatus("successful", statuses),
      failed: findStatus("failed", statuses),
    },
    showBetOpportunities,
    setShowBetOpportunities: (value: boolean) => {
      if (value === true && predictor_id === discordId) {
        setPredictorId("");
      }
      setShowBetOpportunities(value);
      resetPages();
    },
    setStatus: (
      newStatus: Entities.Predictions.PredictionLifeCycle | "all",
      value: boolean,
    ) => {
      setStatus(newStatus, value);
      resetPages();
    },
    sort_by,
    setSortBy: (newSortBy: Endpoints.Predictions.GET_Search.SortByOption) => {
      setSortBy(newSortBy);
      resetPages();
    },
    keyword,
    setKeyword: (newKeyword: string) => {
      setKeyword(newKeyword);
      resetPages();
    },
    predictor_id,
    setPredictorId: (newPredictorId: string) => {
      if (newPredictorId === discordId) {
        setShowBetOpportunities(false);
      }
      setPredictorId(newPredictorId);
      resetPages();
    },
    season_id,
    setSeasonId: (newSeasonId: string | undefined) => {
      setSeasonId(newSeasonId);
      resetPages();
    },
    clearFilters,
    incrementPage,
    reachedEndOfList,
  };
};
