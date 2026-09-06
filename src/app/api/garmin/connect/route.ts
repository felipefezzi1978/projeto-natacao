import { NextResponse } from "next/server";
import { buildGarminAuthUrl } from "@/lib/garmin";

export async function GET() {
  try {
    const url = buildGarminAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Garmin credentials are not configured yet.",
      },
      { status: 500 },
    );
  }
}
