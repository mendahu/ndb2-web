import { format, differenceInDays, isAfter, add } from "date-fns";
import { BetInterface } from "../BetInterface";
import { PillDisplay } from "@/components/PillDisplay";
import { Entities } from "@offnominal/ndb2-api-types/v2";

type UserBetProps = {
  userBet:
    | {
        endorsed: boolean;
        wager: number;
        date: string;
      }
    | undefined;
  handleBet: (endorsed: boolean) => void;
  status: Entities.Predictions.PredictionLifeCycle;
  payoutRatio: number;
  calcDate: string;
};

const UserBet = (props: UserBetProps) => {
  const formatDate = (date: string) => {
    return format(new Date(date), "LLL do, yyyy");
  };

  let betMessage: string | undefined;

  if (props.status !== "open") {
    betMessage = "Predictions must be in OPEN status for bets to be made.";
  }

  let showBetInfo = false;
  let showAddBetInfo = false;
  let showBetInterface = false;
  let showbetEndorsed = false;
  let showPoints = false;

  if (props.status === "open") {
    if (props.userBet) {
      const locked = isAfter(
        new Date(),
        add(new Date(props.userBet.date), { hours: 12 })
      );
      if (locked) {
        showBetInfo = true;
        showbetEndorsed = true;
        showPoints = true;
      } else {
        showBetInfo = true;
        showBetInterface = true;
        showPoints = true;
      }
    }
    if (!props.userBet) {
      showAddBetInfo = true;
      showBetInterface = true;
    }
  } else if (props.userBet) {
    showBetInfo = true;
    showbetEndorsed = true;
    if (props.status !== "retired") {
      showPoints = true;
    }
  }

  return (
    <div className="flex min-h-[168px] flex-col gap-10">
      <div className="flex justify-between gap-10">
        <div className="flex flex-col justify-center md:justify-start">
          {showBetInfo && props.userBet && (
            <>
              <p className="font-bold">YOUR BET</p>
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{`BET ON ${formatDate(
                props.userBet.date
              ).toUpperCase()}`}</p>
            </>
          )}
          {showAddBetInfo && (
            <>
              <p className="font-bold">ADD YOUR BET</p>
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{`WAGER ${differenceInDays(
                new Date(props.calcDate),
                new Date()
              )}`}</p>
            </>
          )}
        </div>
        {showBetInterface && (
          <BetInterface
            handleBet={props.handleBet}
            currentBet={props.userBet?.endorsed}
            disabledMessage={betMessage}
            containerClasses="overflow-hidden flex rounded-full"
            endorseButtonClasses="pr-2 pl-5 py-3"
            undorseButtonClasses="pl-2 pr-5 py-3"
          />
        )}
        {showbetEndorsed && props.userBet && (
          <div className="flex h-[64px] shrink-0 basis-[140px]">
            <PillDisplay
              text={props.userBet.endorsed ? "ENDORSED" : "UNDORSED"}
              color={
                props.userBet.endorsed
                  ? "bg-moss-green"
                  : "bg-deep-chestnut-red"
              }
              textSize={"text-sm"}
            />
          </div>
        )}
      </div>
      {showPoints && props.userBet && (
        <div className="flex justify-between gap-10">
          <div className="flex flex-col justify-center md:justify-start">
            <p className="font-bold uppercase">Potential Points</p>
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              Given Potential Close Date of {formatDate(props.calcDate)}
            </p>
          </div>
          <div className="flex h-[64px] shrink-0 basis-[140px]">
            <PillDisplay
              text={`+/- ${Math.max(
                Math.floor(props.userBet.wager * props.payoutRatio),
                1
              ).toLocaleString()}`}
              color={"bg-silver-chalice-grey"}
              textSize={"text-base"}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBet;
