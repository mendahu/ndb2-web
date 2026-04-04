import { useToast } from "@/app/contexts/toast";
import { RiskPill } from "@/components/RiskPill";
import { APIPredictions } from "@/types/predictions";
import { add, format, isAfter } from "date-fns";
import { BetInterface } from "./BetInterface";
import { APIBets } from "@/types/bets";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Timeline } from "@/components/Timeline";
import { ReactNode } from "react";
import { statusLabel } from "./helpers";
import { Entities } from "@offnominal/ndb2-api-types/v2";
import { buildTimeline } from "@/utils/helpers";

type PredictionListItemProps = {
  updateUserBet: (predictionId: number, endorsed: boolean) => Promise<void>;
  text: ReactNode[];
  userBet: APIBets.UserBet | undefined;
  prediction: Entities.Predictions.PredictionSearchResult;
  loading: boolean;
  discordId: string;
};

export const PredictionListItem = (props: PredictionListItemProps) => {
  const { addToast } = useToast();

  let statusBackground = "bg-moonstone-blue";
  let showVotes = false;

  if (props.prediction.status === "retired") {
    statusBackground = "bg-silver-chalice-grey";
  } else if (props.prediction.status === "closed") {
    statusBackground = "bg-california-gold";
    showVotes = true;
  } else if (props.prediction.status === "successful") {
    statusBackground = "bg-moss-green";
    showVotes = true;
  } else if (props.prediction.status === "failed") {
    statusBackground = "bg-deep-chestnut-red";
    showVotes = true;
  }

  const gridRows = showVotes ? "grid-rows-4" : "grid-rows-2";

  const handleBet = (endorsed: boolean) => {
    if (props.userBet) {
      if (props.userBet.endorsed === endorsed) {
        return;
      }

      if (
        isAfter(new Date(), add(new Date(props.userBet?.date), { hours: 12 }))
      ) {
        return addToast({
          message: "Bets can only be changed within 12 hours of being made.",
          type: "error",
        });
      }
    }

    props
      .updateUserBet(props.prediction.id, endorsed)
      .then(() => {
        addToast({
          message: "Bet successfully added",
          type: "success",
        });
      })
      .catch((err) => {
        addToast({
          message: err,
          type: "error",
        });
      });
  };

  let betMessage;

  if (
    props.prediction.status !== "open" &&
    props.prediction.status !== "checking"
  ) {
    betMessage = "Predictions must be in OPEN status for bets to be made.";
  }

  const showDueCheckDate =
    props.prediction.status === "open" ||
    props.prediction.status === "checking";

  return (
    <article
      id={"prediction-" + props.prediction.id}
      className={props.loading ? "animate-pulse" : ""}
    >
      <details className="group h-[7em] rounded-lg bg-slate-200 open:h-full dark:bg-slate-700">
        <summary className="flex h-full gap-4">
          <div
            className={
              statusBackground +
              " relative h-[7em] shrink-0 grow-0 basis-12 rounded-bl-lg rounded-tl-lg group-open:rounded-bl-none group-open:rounded-br-lg"
            }
          >
            <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 uppercase">
              {statusLabel[props.prediction.status]}
            </p>
          </div>
          <div className="hidden shrink-0 grow-0 sm:basis-32 md:block">
            <div className="mt-3 rounded-md border-slate-700 bg-slate-300 px-4 dark:border-slate-200 dark:bg-slate-500">
              <p className="w-full text-center text-xl">
                #{props.prediction.id}
              </p>
            </div>
            {showDueCheckDate && (
              <div className="mt-3 rounded-md border-slate-700 bg-slate-300 px-2 py-1 dark:border-slate-200 dark:bg-slate-500">
                <p className="w-full text-center text-sm">
                  {props.prediction.driver === "date" && (
                    <>
                      Due:
                      <br />{" "}
                      {format(
                        props.prediction.due_date ?? new Date(0),
                        "MMM d, yyyy"
                      )}
                    </>
                  )}
                  {props.prediction.driver === "event" && (
                    <>
                      Check:
                      <br />{" "}
                      {format(
                        props.prediction.check_date ?? new Date(0),
                        "MMM d, yyyy"
                      )}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
          <div className="relative h-[6em] grow basis-24 self-center overflow-hidden after:absolute after:bottom-0 after:right-0 after:h-[1.5em] after:w-3/4 after:bg-gradient-to-r after:from-white/0 after:to-slate-200/100 after:text-right group-open:mt-2 group-open:h-full group-open:self-start group-open:overflow-visible group-open:after:hidden dark:after:to-slate-700/100">
            <div className="w-full">
              <span className="mr-2 rounded-md bg-slate-300 px-1.5 py-0.5 dark:bg-slate-500 md:hidden">
                #{props.prediction.id}
              </span>
              {props.text}
            </div>
          </div>

          <BetInterface
            handleBet={handleBet}
            disabledMessage={betMessage}
            currentBet={props.userBet?.endorsed}
            containerClasses="overflow-hidden flex flex-col rounded-br-lg rounded-tr-lg h-[7em] shrink-0 grow-0 basis-12 group-open:rounded-bl-lg group-open:rounded-br-none"
          />
        </summary>
        <div className="mb-4 mt-8 flex gap-4">
          <div className=" grow-0 basis-12"></div>
          <div className="flex grow flex-col gap-8 md:flex-row md:items-start">
            <Timeline items={buildTimeline(props.prediction)} />
            <div
              className={
                "grid grow basis-1/2 grid-cols-[auto,2rem,auto] gap-4 " +
                gridRows
              }
            >
              <div className="font-bold uppercase">Endorsements</div>
              <div className="flex justify-center">
                <div className="rounded-full bg-slate-400 px-2 dark:bg-slate-500">
                  <span>{props.prediction.bets.endorsements}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <RiskPill value={props.prediction.payouts.endorse} />
              </div>
              <div className="font-bold uppercase">Undorsements</div>
              <div className="flex justify-center">
                <div className="rounded-full bg-slate-400 px-2 dark:bg-slate-500">
                  <span>{props.prediction.bets.undorsements}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <RiskPill value={props.prediction.payouts.undorse} />
              </div>
              {showVotes && (
                <>
                  <div className="font-bold uppercase">Yes Votes</div>
                  <div className="flex justify-center">
                    <div className="rounded-full bg-slate-400 px-2 dark:bg-slate-500">
                      <span>{props.prediction.votes.yes}</span>
                    </div>
                  </div>
                  <div></div>
                  <div className="font-bold uppercase">No Votes</div>
                  <div className="flex justify-center">
                    <div className="rounded-full bg-slate-400 px-2 dark:bg-slate-500">
                      <span>{props.prediction.votes.no}</span>
                    </div>
                  </div>
                  <div></div>
                </>
              )}
            </div>
          </div>
          <div className=" grow-0 basis-12"></div>
        </div>
        <div className="flex justify-end p-6">
          <Link href={`/predictions/${props.prediction.id}`} prefetch={false}>
            <Button size="sm">More Details</Button>
          </Link>
        </div>
      </details>
    </article>
  );
};
