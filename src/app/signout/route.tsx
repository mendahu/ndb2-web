import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export async function GET() {
  // NEXT JS has a bug where it doesn't recognize the typing for the set method inside a server route
  // This comment written while on Next.JS v 13.4.2
  // @ts-ignore
  cookies().set({
    name: "token",
    value: undefined,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV !== "development",
    expires: -1,
    sameSite: "lax",
  });

  return NextResponse.redirect(BASE_URL + "/signin");
}