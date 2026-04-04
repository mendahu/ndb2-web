import { useState } from "react";
import { ListBet } from "./page";
import { AppJWTPayload } from "@/utils/auth";
import { Entities } from "@offnominal/ndb2-api-types/v2";

export const useBets = (
  initialBets: ListBet[],
  payoutRatio: { endorse: number; undorse: number },
  user: AppJWTPayload,
) => {
  const [bets, setBets] = useState(initialBets);
  const [payoutRatios, setPayoutRatios] = useState<{
    endorse: number;
    undorse: number;
  }>(payoutRatio);

  const userBet = bets.find((bet) => bet.better_discordId === user.discordId);

  const updateUserBet = (predictionId: number, endorsed: boolean) => {
    return fetch("/api/predictions/" + predictionId + "/bets", {
      method: "POST",
      body: JSON.stringify({ discord_id: user.discordId, endorsed }),
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
      .then((prediction: Entities.Predictions.Prediction) => {
        const updatedBet = prediction.bets.find(
          (b) => b.better.discord_id === user.discordId,
        );
        if (!updatedBet) {
          throw new Error("Bet not found");
        }
        const newBet: ListBet = {
          ...updatedBet,
          name: user.name,
          avatarUrl: user.avatarUrl,
          better_discordId: user.discordId,
        };

        if (userBet) {
          setBets((prev) => {
            const newBets: ListBet[] = [];

            for (const bet of prev) {
              if (bet.id === newBet.id) {
                newBets.push(newBet);
              } else {
                newBets.push(bet);
              }
            }

            return newBets;
          });
        } else {
          setBets((prev) => [...prev, newBet]);
        }
        setPayoutRatios(prediction.payouts);
      });
  };

  return {
    endorsements: bets.filter((b) => b.endorsed),
    undorsements: bets.filter((b) => !b.endorsed),
    userBet,
    updateUserBet,
    payoutRatios,
  };
};
