import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChunkingResult } from "./chunking.types";

export async function chunkText(text: string): Promise<ChunkingResult> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitChunks = await splitter.splitText(text);

  const chunks = splitChunks.map((chunk, index) => ({
    id: index + 1,
    content: chunk,
  }));

  return {
    success: true,
    chunks,
    totalChunks: chunks.length,
  };
}