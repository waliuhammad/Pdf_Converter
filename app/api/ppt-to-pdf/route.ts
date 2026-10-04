import { NextRequest } from "next/server";
import { metered } from "@/lib/metered";
import { officeToPdfRoute } from "@/lib/convert-routes";

export const runtime = "nodejs";

// LibreOffice renders every slide, so the PDF keeps the design, images and layout.
export const maxDuration = 120;

export const POST = metered((req: NextRequest) => officeToPdfRoute(req, "powerpoint"));
