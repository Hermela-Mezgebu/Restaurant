import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL;

export async function GET(request: NextRequest) {
  try {
    if (!API_URL) {
      return NextResponse.json(
        {
          error:
            "API_URL is not configured. Add your backend API URL to .env.local.",
        },
        { status: 500 },
      );
    }

    const range =
      request.nextUrl.searchParams.get("range") ??
      "30d";

    const response = await fetch(
      `${API_URL}/admin/reports?range=${encodeURIComponent(
        range,
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const message = await response.text();

      return NextResponse.json(
        {
          error:
            message ||
            `Backend returned ${response.status}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/reports failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to connect to the analytics backend.",
      },
      { status: 500 },
    );
  }
}