export interface ParseResult {
  success: boolean;
  text: string;
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  };
}