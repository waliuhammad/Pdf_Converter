export interface Chunk {
  id: number;
  content: string;
}

export interface ChunkingResult {
  success: boolean;
  chunks: Chunk[];
  totalChunks: number;
}