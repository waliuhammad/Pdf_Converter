import { getAppConfig } from "@/lib/remote-config";
import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { rejectBadUpload } from "@/lib/uploads";

// Gemini summarises the whole document — measured about 6s,
// so the platform default is not enough.
export const maxDuration = 60;

const AI_SERVICE =
  process.env.AI_SERVICE_URL || "http://localhost:8001";

export const POST = metered(async (req: NextRequest) => {
  try {
    // Remote Config kill-switch: lets the AI features be disabled from the
    // Firebase Console (parameter: ai_tools_enabled) without a redeploy.
    const { aiToolsEnabled } = await getAppConfig();
    if (!aiToolsEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "AI features are temporarily disabled. Please try again later.",
        },
        { status: 503 }
      );
    }

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Checked here rather than relayed unseen: this route forwards the
    // whole form to the AI service, so an oversized or wrong-typed
    // upload would otherwise become that service's problem too.
    const upload = formData.get("file");
    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const badUpload = rejectBadUpload(upload, "pdf");
    if (badUpload) return badUpload;

    const response = await fetch(`${AI_SERVICE}/api/summary`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to connect to AI Service.",
      },
      {
        status: 500,
      }
    );
  }
}, { signInMessage: "Please sign in to use AI features." });