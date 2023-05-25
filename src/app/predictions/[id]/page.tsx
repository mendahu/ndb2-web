import { AuthClient } from "../../../utils/auth";
import { redirect } from "next/navigation";
import { Navigation } from "../../components/Navigation";
import { Ndb2Client } from "../../../utils/ndb2";
import { Card } from "@/components/Card";
import React from "react";

import { Vote } from "../../../components/Vote";
import { APIPredictions } from "@/types/predictions";

// SERVER SIDE DATA FETCHING
async function fetchPrediction(
  id: Number
): Promise<APIPredictions.EnhancedPrediction> {
  const ndb2Client = new Ndb2Client();

  const headers: RequestInit["headers"] = { cache: "no-store" };

  try {
    const predictionInfo = await ndb2Client.getPredictionById(id, headers);
    return predictionInfo.data;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch prediction data");
  }
}

export default async function Predictions({ params }: any) {
  const authClient = new AuthClient();
  const payload = await authClient.verify();

  if (!payload) {
    return redirect("/signin");
  }

  const prediction = await fetchPrediction(params.id);

  console.log(prediction);
  for (const bet of prediction.bets) {
    console.log(bet);
  }

  const endorsement = prediction.bets.filter((bet) => bet.endorsed === true);
  const undorsement = prediction.bets.filter((bet) => bet.endorsed === false);

  return (
    <div className="flex h-full w-full flex-col content-center p-8 align-middle">
      <nav className="mb-8 mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="h-min text-center text-3xl sm:text-4xl md:text-5xl">
          NOSTRADAMBOT<span className={"text-moonstone-blue"}>2</span>
        </h1>
        <Navigation />
      </nav>
      <main>
        <div className="flex flex-col">
          <div className="flex flex-row">
            <div>
              Prediction # {prediction.id}
              <br />
              by (Discord User) {prediction.predictor.discord_id}
              <br />
            </div>
            <div>STATUS: {prediction.status}</div>
          </div>
          <div>
            <br />
            TEXT: {prediction.text}
          </div>
        </div>
        <div className="flex justify-between">
          <div>
            <br />
            CREATED: {prediction.created_date}
            <br />
            DUE: {prediction.due_date}
            <br />
            <br />
          </div>
          <div>
            <Vote />
          </div>
        </div>
        BETS
        <div className="flex justify-evenly">
          <br />
          <br />
          <Card title="Endorsements">
            {endorsement.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Better </th>
                    <th>Date </th>
                    <th>Wager </th>
                    <th>Type of Bet </th>
                  </tr>
                </thead>
                <tbody>
                  {endorsement.map((bet: any) => {
                    return (
                      <tr key={bet.better.discord_id}>
                        <td>{bet.better.discord_id}</td>
                        <td>{bet.date}</td>
                        <td>{bet.wager}</td>
                        <td>{bet.endorsed ? "Endorsed" : "Undorsed"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              "Nothing to see here"
            )}
          </Card>
          <Card title="Undorsements">
            {undorsement.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Better </th>
                    <th>Date </th>
                    <th>Wager </th>
                    <th>Type of Bet </th>
                  </tr>
                </thead>
                <tbody>
                  {undorsement.map((bet: any) => {
                    return (
                      <tr key={bet.better.discord_id}>
                        <td>{bet.better.discord_id}</td>
                        <td>{bet.date}</td>
                        <td>{bet.wager}</td>
                        <td>{bet.endorsed ? "Endorsed" : "Undorsed"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              "Nothing to see here"
            )}
          </Card>
        </div>
        <br />
        <br />
      </main>
    </div>
  );
}
