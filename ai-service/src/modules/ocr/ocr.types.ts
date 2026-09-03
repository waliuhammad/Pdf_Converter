export interface OCRResult {
    text: string;
    pages: number | null;
    words: number;
    characters: number;
}