import { NextRequest, NextResponse } from "next/server";
import authAPI from "./utils/auth";

export async function middleware(request: NextRequest) {
  // sets url and path headers for easy access
  const url = new URL(request.url);
  const origin = url.origin;
  const pathname = url.pathname;
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-url", request.url);
  requestHeaders.set("x-origin", origin);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-search", url.search);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // refresh cookies
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return response;
    }

    const payload = await authAPI.verify(token);

    if (!payload) {
      return response;
    }

    const newToken = await authAPI.sign(payload);
    response.cookies.set(authAPI.buildCookie(newToken));
  } catch (err) {
    console.error(err);
  }

  return response;
}
