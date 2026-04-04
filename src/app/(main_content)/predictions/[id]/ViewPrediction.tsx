"use client";

import { Timeline } from "@/components/Timeline";
import { BetListItem } from "./BetListItem";
import { add, format, isAfter } from "date-fns";
import { ListBet } from "./page";
import { Card } from "@/components/Card";
import { List } from "@/components/List";
import { Empty } from "@/components/Empty";
import { useBets } from "./useBets";
import { Entities } from "@offnominal/ndb2-api-types/v2";
import { useToast } from "@/app/contexts/toast";
import { AppJWTPayload } from "@/utils/auth";
import { RiskPill } from "@/components/RiskPill";
import UserBet from "./UserBet";
import { buildTimeline } from "@/utils/helpers";

const formatDate = (date: string) => {
  return format(new Date(date), "LLL do, yyyy");
};

export type ViewPredictionProps = {
  prediction: Entities.Predictions.Prediction;
  bets: ListBet[];
  user: AppJWTPayload;
};

const listHeader = (
  <div className="flex gap-x-4 gap-y-1 font-bold uppercase">
    <div className="basis-9"></div>
    <p className="grow text-sm">User</p>
    <p className="shrink-0 basis-10 text-sm">Wager</p>
  </div>
);

export default function ViewPrediction(props: ViewPredictionProps) {
  const { addToast } = useToast();

  const { endorsements, undorsements, userBet, payoutRatios, updateUserBet } =
    useBets(
      props.bets,
      {
        endorse: props.prediction.payouts.endorse,
        undorse: props.prediction.payouts.undorse,
      },
      props.user
    );

  const endorseArray = endorsements.map((bet) => {
    return (
      <BetListItem
        key={bet.id}
        date={formatDate(bet.date)}
        avatarUrl={bet.avatarUrl}
        name={bet.name}
        value={bet.wager}
      />
    );
  });

  const undorseArray = undorsements.map((bet) => {
    return (
      <BetListItem
        key={bet.id}
        date={formatDate(bet.date)}
        avatarUrl={bet.avatarUrl}
        name={bet.name}
        value={bet.wager}
      />
    );
  });

  const payoutRatio = userBet?.endorsed
    ? payoutRatios.endorse
    : payoutRatios.undorse;

  const handleBet = (endorsed: boolean) => {
    if (userBet) {
      if (userBet.endorsed === endorsed) {
        return;
      }

      if (isAfter(new Date(), add(new Date(userBet?.date), { hours: 12 }))) {
        return addToast({
          message: "Bets can only be changed within 12 hours of being made.",
          type: "error",
        });
      }
    }

    updateUserBet(props.prediction.id, endorsed)
      .then(() => {
        addToast({
          message: "Bet successfully updated",
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

  return (
    <>
      <div className="mt-8 flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="basis-1/2">
          <Timeline items={buildTimeline(props.prediction)} />
        </div>
        <div className="basis-1/2">
          <UserBet
            userBet={userBet}
            calcDate={
              props.prediction.driver === "date"
                ? props.prediction.due_date
                : props.prediction.check_date
            }
            handleBet={handleBet}
            status={props.prediction.status}
            payoutRatio={payoutRatio}
          />
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-2xl uppercase">Bets</h3>
      </div>
      <div className="mt-4 flex flex-col gap-8 md:flex-row md:items-start">
        <Card
          header={
            <div className="flex items-center justify-between">
              <h2 className="order-1 text-center text-xl uppercase text-white sm:text-2xl">
                Endorsements
              </h2>
              <div className="order-2">
                <RiskPill value={payoutRatios.endorse} />
              </div>
            </div>
          }
          className="grow basis-4"
        >
          {endorsements.length > 0 ? (
            <List items={endorseArray} headerElement={listHeader} />
          ) : (
            <Empty text="None" className="pb-6" />
          )}
        </Card>
        <Card
          header={
            <div className="flex items-center justify-between">
              <h2 className="order-1 text-center text-xl uppercase text-white sm:text-2xl md:order-2">
                Undorsements
              </h2>
              <div className="order-2 md:order-1">
                <RiskPill value={payoutRatios.undorse} />
              </div>
            </div>
          }
          className="grow basis-4"
        >
          {undorsements.length > 0 ? (
            <List items={undorseArray} headerElement={listHeader} />
          ) : (
            <Empty text="None" className="pb-6" />
          )}
        </Card>
      </div>
    </>
  );
}
