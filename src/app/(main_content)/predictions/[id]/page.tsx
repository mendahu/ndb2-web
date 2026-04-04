import { redirect } from "next/navigation";
import { PillDisplay } from "@/components/PillDisplay";
import authAPI from "@/utils/auth";
import ndb2API from "@/utils/ndb2";
import discordAPI, { GuildMemberManager } from "@/utils/discord";
import { ShortDiscordGuildMember } from "@/types/discord";
import { APIPredictions } from "@/types/predictions";
import { Endpoints, Entities } from "@offnominal/ndb2-api-types/v2";
import { APIBets } from "@/types/bets";
import { Avatar } from "@/components/Avatar";
import { hydrateTextWithMemberHandles } from "../hydrateTextWithMemberHandles";
import { Metadata } from "next";
import ViewPrediction from "./ViewPrediction";
import { Card } from "@/components/Card";
import { List } from "@/components/List";
import { Empty } from "@/components/Empty";
import { VoteListItem } from "./VoteListItem";
import { cookies } from "next/headers";
import { generateURIComponent, getURLSearchParams } from "@/utils/helpers";
import { PageProps } from "@/types/base";
import { statusLabel } from "../helpers";

const defaultAvatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";

export type ListBet = Omit<Entities.Predictions.Prediction["bets"][number], "better"> & {
  name: string;
  avatarUrl: string;
  better_discordId: string;
};

const generateBet = (
  bet: Entities.Predictions.Prediction["bets"][number],
  member: ShortDiscordGuildMember
): ListBet => {
  return {
    id: bet.id,
    date: bet.date,
    wager: bet.wager,
    valid: bet.valid,
    payout: bet.payout,
    endorsed: bet.endorsed,
    season_payout: bet.season_payout,
    name: member.name,
    avatarUrl: member.avatarUrl,
    better_discordId: member.discordId,
  };
};

export type ListVote = Omit<Entities.Predictions.Prediction["votes"][number], "voter"> & {
  name: string;
  avatarUrl: string;
  voter_discordId: string;
};

const generateVote = (
  vote: Entities.Predictions.Prediction["votes"][number],
  member: ShortDiscordGuildMember | undefined
): ListVote => {
  return {
    id: vote.id,
    vote: vote.vote,
    voted_date: vote.voted_date,
    name: member?.name || "Unknown User",
    avatarUrl: member?.avatarUrl || defaultAvatarUrl,
    voter_discordId: member?.discordId || "",
  };
};

type PredictionsPageProps = {} & PageProps;

// SERVER SIDE DATA FETCHING

async function baseFetch(id: number) {
  const headers: RequestInit["headers"] = { cache: "no-store" };
  const guildMemberManager = new discordAPI.GuildMemberManager();

  const promises: [Promise<void>, Promise<Endpoints.Predictions.GET_ById.Response>] = [
    guildMemberManager.initialize(),
    ndb2API.getPredictionById(id, headers),
  ];

  const [_, results] = await Promise.all(promises);
  const prediction = results.data;
  return { prediction, guildMemberManager };
}

export async function generateMetadata(
  props: PredictionsPageProps
): Promise<Metadata> {
  const id = parseInt(props.params.id);
  const { prediction, guildMemberManager } = await baseFetch(id);

  if (!prediction) {
    return {
      title: "Prediction Not Found",
      description: "The prediction you are looking for does not exist.",
    };
  }

  const member = await guildMemberManager.getMemberByDiscordId(
    prediction.predictor.discord_id
  );

  return {
    title: `Prediction #${prediction.id}`,
    description: `Predictions detail page for prediction #${prediction.id} by ${member.name}`,
    openGraph: {
      title: `Prediction #${prediction.id} by ${member.name}`,
      description: prediction.text,
      url: `https://ndb2.offnom.com/predictions/${id}`,
      siteName: "Nostradambot2",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `Prediction #${prediction.id}`,
      description: `Predictions detail page for prediction #${prediction.id} by ${member.name}`,
      site: "@offnom",
      creator: "@JakeOnOrbit",
    },
  };
}

async function fetchData(id: number): Promise<{
  prediction: Entities.Predictions.Prediction;
  predictor: ShortDiscordGuildMember;
  bets: ListBet[];
  votes: ListVote[];
  season: Entities.Seasons.Season | undefined;
  members: ShortDiscordGuildMember[];
}> {
  let prediction: Entities.Predictions.Prediction;
  let guildMemberManager: GuildMemberManager;
  let season: Entities.Seasons.Season | undefined;

  try {
    const baseData = await baseFetch(id);
    if (!baseData.prediction) {
      throw new Error("Prediction not found");
    }
    const results = await ndb2API.getSeasons();
    if (!results.success) {
      throw new Error("Failed to fetch seasons");
    }
    const seasons = results.data;
    prediction = baseData.prediction;
    guildMemberManager = baseData.guildMemberManager;
    season = seasons.find((s) => s.id === prediction.season_id);
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch prediction data");
  }

  try {
    const members = guildMemberManager.getMembers();
    const userLookup = await guildMemberManager.buildUserLookup([
      ...Object.values(members).map((m) => m.discordId),
      ...prediction.bets.map((b) => b.better.discord_id),
    ]);
    const predictor = userLookup[prediction.predictor.discord_id];
    const bets = prediction.bets
      .filter((bet) => bet.valid)
      .map((bet) => generateBet(bet, userLookup[bet.better.discord_id]));

    const votes = prediction.votes.map((vote) =>
      generateVote(vote, userLookup[vote.voter.discord_id])
    );

    return {
      prediction,
      predictor,
      bets,
      votes,
      season,
      members: Object.values(members),
    };
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch user information");
  }
}

export default async function Predictions(props: PredictionsPageProps) {
  const id = parseInt(props.params.id);
  if (isNaN(id)) {
    return redirect("/predictions");
  }

  const token = cookies().get("token");
  const payload = await authAPI.verify(token);

  if (!payload) {
    const queryString = getURLSearchParams(props.searchParams).toString();
    const path = "/predictions/" + props.params.id;
    const uriComponent = generateURIComponent(path, queryString);
    return redirect("/signin?returnTo=" + uriComponent);
  }

  const { prediction, predictor, votes, bets, season, members } =
    await fetchData(id);

  const statusColor: Record<
    Entities.Predictions.PredictionLifeCycle,
    string
  > = {
    retired: "bg-silver-chalice-grey",
    successful: "bg-moss-green",
    failed: "bg-deep-chestnut-red",
    open: "bg-moonstone-blue",
    checking: "bg-moonstone-blue",
    closed: "bg-silver-chalice-grey",
  };

  const yesVotes = votes.filter((vote) => vote.vote);
  const noVotes = votes.filter((vote) => !vote.vote);

  const yesVoteArray = yesVotes.map((vote) => {
    return (
      <VoteListItem key={vote.id} name={vote.name} avatarUrl={vote.avatarUrl} />
    );
  });
  const noVoteArray = noVotes.map((vote) => {
    return (
      <VoteListItem key={vote.id} name={vote.name} avatarUrl={vote.avatarUrl} />
    );
  });

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
          <h2 className="text-xl uppercase sm:text-2xl md:basis-full">
            Prediction # {prediction.id}
          </h2>
          <div className="flex items-start gap-2 md:grow-[2]">
            <Avatar src={predictor.avatarUrl} size={24} alt={predictor.name} />
            <span className="text-slate-600 dark:text-slate-300">
              {predictor.name}
            </span>
          </div>
          <div className="md:grow-[1]">
            <span className="text-sm font-bold uppercase text-slate-600 dark:text-slate-300">
              Season:
            </span>
            <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">
              {season?.name || "Future Season"}
            </span>
          </div>
        </div>
        <div className="flex h-[64px] w-[136px]">
          <PillDisplay
            text={statusLabel[prediction.status]}
            color={statusColor[prediction.status]}
            textSize="text-md"
            padding={"px-6 py-5"}
          />
        </div>
      </div>
      <div className="mt-8 rounded-xl bg-slate-300 p-4 dark:bg-slate-600">
        <p>{hydrateTextWithMemberHandles(prediction.text, members)}</p>
      </div>
      <ViewPrediction
        prediction={prediction}
        // predictionId={prediction.id}
        // status={prediction.status}
        // created_date={prediction.created_date}
        // due_date={prediction.due_date || ""}
        // closed_date={prediction.closed_date}
        // triggered_date={prediction.triggered_date}
        // judged_date={prediction.judged_date}
        // retired_date={prediction.retired_date}
        bets={bets}
        // endorseRatio={prediction.payouts.endorse}
        // undorseRatio={prediction.payouts.undorse}
        user={payload}
      />
      <div className="mt-8">
        <h3 className="text-2xl uppercase">Votes</h3>
      </div>
      <div className="mt-4 flex flex-col gap-8 md:flex-row md:items-start">
        <Card
          header={
            <h2 className="text-center text-2xl uppercase text-white sm:text-3xl">
              Yes Votes
            </h2>
          }
          className="grow basis-4"
        >
          {yesVotes.length > 0 ? (
            <List items={yesVoteArray} />
          ) : (
            <Empty text="None" className="pb-6" />
          )}
        </Card>
        <Card
          header={
            <h2 className="text-center text-2xl uppercase text-white sm:text-3xl">
              No Votes
            </h2>
          }
          className="grow basis-4"
        >
          {noVotes.length > 0 ? (
            <List items={noVoteArray} />
          ) : (
            <Empty text="None" className="pb-6" />
          )}
        </Card>
      </div>
    </>
  );
}
