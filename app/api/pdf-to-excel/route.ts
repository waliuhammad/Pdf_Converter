import { NextRequest } from "next/server";
import { metered } from "@/lib/metered";
import { pdfToOfficeRoute } from "@/lib/convert-routes";

export const runtime = "nodejs";

// Each page becomes a sheet showing the page as it looks in the PDF, plus a Text sheet.
export const maxDuration = 120;

export const POST = metered((req: NextRequest) => pdfToOfficeRoute(req, "xlsx"));
