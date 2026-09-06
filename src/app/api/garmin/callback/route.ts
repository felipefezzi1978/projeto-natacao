import { NextResponse } from "next/server";
import { getGarminConfig } from "@/lib/garmin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing OAuth callback parameters." }, { status: 400 });
  }

  const config = getGarminConfig();

  if (!config.clientId || !config.clientSecret) {
    return NextResponse.json({ error: "Garmin OAuth is not configured in this environment." }, { status: 500 });
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  const data = (await response.json()) as { error?: string; access_token?: string };

  if (!response.ok || !data.access_token) {
    return NextResponse.json({ error: data.error ?? "Failed to exchange Garmin code." }, { status: 400 });
  }

  return NextResponse.redirect("/?garmin=connected");
}
