import { NextRequest } from "next/server";
import { metered } from "@/lib/metered";
import { officeToPdfRoute } from "@/lib/convert-routes";

export const runtime = "nodejs";

// LibreOffice renders the sheets with their formatting, borders and column widths.
export const maxDuration = 120;

export const POST = metered((req: NextRequest) => officeToPdfRoute(req, "excel"));
