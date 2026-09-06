export type GarminTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export function getGarminConfig() {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = process.env.GARMIN_REDIRECT_URI ?? "http://localhost:3000/api/garmin/callback";

  return {
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
    redirectUri,
    authorizeUrl: "https://connect.garmin.com/oauthConfirm",
    tokenUrl: "https://connectapi.garmin.com/oauth-service/oauth/access_token",
    scope: "activity:read",
  };
}

export function buildGarminAuthUrl() {
  const config = getGarminConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error("Garmin credentials are not configured.");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: crypto.randomUUID(),
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}
