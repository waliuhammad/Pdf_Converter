import { generateFromDocument } from "../generator";
import { SummaryResult } from "./summary.types";

export async function generateSummary(
  documentText: string
): Promise<SummaryResult> {
  const generator = await generateFromDocument(
  `You are an expert document summarizer.

Your task is to produce a concise summary of the uploaded PDF.

Rules:
- Write a maximum of 5 bullet points.
- Keep the total summary under 150 words.
- Focus only on the most important ideas.
- Combine related information into one point.
- Do NOT copy sentences directly from the document.
- Do NOT list every detail.
- Ignore repetitive information.

Special cases:
- If the document is a CV or resume, summarize:
  • Candidate profile
  • Years of experience
  • Key technical and soft skills
  • Education
  • Most important achievements

Return only the summary in bullet points.`,
  documentText
);
  return {
    summary: generator.answer,
  };
}