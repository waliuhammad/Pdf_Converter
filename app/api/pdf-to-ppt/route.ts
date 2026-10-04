import { NextRequest } from "next/server";
import { metered } from "@/lib/metered";
import { pdfToOfficeRoute } from "@/lib/convert-routes";

export const runtime = "nodejs";

// Each page becomes a slide that looks exactly like it does in the PDF.
export const maxDuration = 120;

export const POST = metered((req: NextRequest) => pdfToOfficeRoute(req, "pptx"));
