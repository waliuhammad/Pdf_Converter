/**
 * The "how to use" text under each tool. Every line describes what the tool's
 * code actually does — options, output, limits — so when a tool changes, its
 * guide changes in the same commit. Keyed by the tool's href in lib/tools.ts.
 */
export interface ToolGuide {
    steps: string[];
    notes: string[];
}

export const toolGuides: Record<string, ToolGuide> = {
    "/merge-pdf": {
        steps: [
            "Upload two or more PDF files (up to 30 at once).",
            "Put them in order by dragging, using the arrows, or sorting by name.",
            "Rotate or remove individual pages or whole files if you need to.",
            "Merge and download the result as a single PDF.",
        ],
        notes: [
            "Password-protected files can't be merged. Remove the password with Unlock PDF first.",
            "Pages keep their original size and content; only their order and rotation change.",
        ],
    },
    "/split-pdf": {
        steps: [
            "Upload one PDF.",
            "Choose Split by range to cut the document into custom or fixed-size page ranges, or Extract pages to pull out every page or only the pages you list (for example 1,5-8,12).",
            "Optionally merge the selected ranges or pages back into one PDF.",
            "Download a single PDF, or a ZIP when the split produces several files.",
        ],
        notes: [
            "A single split can produce up to 500 files.",
            "Password-protected PDFs need to be unlocked before they can be split.",
        ],
    },
    "/compress-pdf": {
        steps: [
            "Upload up to 10 PDFs.",
            "Pick a level: Low (best quality), Average (recommended) or High (smallest size).",
            "Compress, then download one PDF or a ZIP of all of them.",
        ],
        notes: [
            "Compression works mainly on images inside the PDF. Low keeps images at 200 dpi, Average at 150 dpi and High at 100 dpi, with stronger JPEG compression at each step.",
            "Average and High also remove document metadata such as the author and editing software.",
            "If a file can't be made any smaller, you get the original back unchanged, so the result is never larger.",
            "Text-only PDFs usually shrink very little, because there are few images to compress.",
        ],
    },
    "/rotate-pdf": {
        steps: [
            "Upload up to 20 PDFs.",
            "Rotate everything left or right, or turn individual documents or pages in 90° steps. Filter to portrait or landscape pages to fix just those.",
            "Apply and download the rotated PDF, or a ZIP when you rotated several files.",
        ],
        notes: [
            "Rotation is lossless: pages are turned, not re-rendered.",
            "Password-protected PDFs need to be unlocked first.",
        ],
    },
    "/pdf-to-word": {
        steps: [
            "Upload one PDF.",
            "Optionally choose a language to translate the text into while converting.",
            "Convert and download the Word (.docx) file.",
        ],
        notes: [
            "Each page is rebuilt as a background image with the text placed on top in editable text boxes, so the layout matches the original closely.",
            "Scanned pages are read with English text recognition (OCR). Other scripts on scanned pages may not convert to editable text.",
            "Choosing a translation language sends the document's text to Google's Gemini API.",
        ],
    },
    "/word-to-pdf": {
        steps: [
            "Upload a .doc or .docx file.",
            "Convert and download the PDF.",
        ],
        notes: [
            "The conversion uses LibreOffice, so documents that rely on fonts not available to it may show substitute fonts.",
        ],
    },
    "/pdf-to-image": {
        steps: [
            "Upload one PDF.",
            "Choose Page to JPG to turn whole pages into images, or Extract images to save the pictures embedded in the PDF.",
            "Pick Normal (150 dpi) or High (300 dpi) quality, and all pages or a specific page. For Page to JPG you can also set page size, orientation and margins.",
            "Download a single JPG, or a ZIP when there are several images.",
        ],
        notes: [
            "High quality gives sharper images that are also larger files.",
        ],
    },
    "/image-to-pdf": {
        steps: [
            "Add your images (JPG, PNG, WebP, GIF or BMP).",
            "Reorder or remove them, then choose page size (fit to image, A4 or US Letter), orientation and margin.",
            "Create one PDF with every image, or a separate PDF for each.",
        ],
        notes: [
            "This tool runs entirely in your browser: the images are never uploaded to our servers.",
        ],
    },
    "/pdf-to-excel": {
        steps: [
            "Upload one PDF.",
            "Convert and download the Excel (.xlsx) workbook.",
        ],
        notes: [
            "Each page becomes an editable grid of its text, plus a separate preview sheet that shows the original layout.",
            "The tool reads the text inside the PDF. Scanned PDFs have no text layer, so run them through OCR PDF first.",
        ],
    },
    "/excel-to-pdf": {
        steps: [
            "Upload an .xlsx, .xls or .csv file.",
            "Check the preview of the first rows of each sheet.",
            "Convert and download the PDF, which includes every sheet in full.",
        ],
        notes: [
            "The conversion uses LibreOffice, so fonts it doesn't have may be replaced with similar ones.",
        ],
    },
    "/pdf-to-ppt": {
        steps: [
            "Upload one PDF.",
            "Convert and download the PowerPoint (.pptx) file, with one slide per page.",
        ],
        notes: [
            "Text is placed in editable text boxes over an image of each page, so slides look like the original.",
            "Scanned pages are read with English text recognition (OCR).",
        ],
    },
    "/ppt-to-pdf": {
        steps: [
            "Upload a .ppt or .pptx file.",
            "Convert and download the PDF, with one page per slide.",
        ],
        notes: [
            "Animations and transitions don't carry over to PDF.",
        ],
    },
    "/watermark-pdf": {
        steps: [
            "Upload one PDF.",
            "Choose a text watermark (font, size, style and colour) or a PNG/JPEG image.",
            "Set the position (one of nine spots or tiled across the page), transparency, rotation, whether it sits over or under the content, and which pages get it.",
            "Apply and download the watermarked PDF.",
        ],
        notes: [
            "Password-protected PDFs need to be unlocked first.",
        ],
    },
    "/sign-pdf": {
        steps: [
            "Upload one PDF.",
            "Type your name and pick a style, or draw your signature with the pen.",
            "Choose left, centre or right near the bottom of the page, and the current page or all pages.",
            "Apply and download the signed PDF.",
        ],
        notes: [
            "This adds a visible signature image to the page. It is not a certificate-based digital signature, so it does not prove who signed or detect later changes.",
        ],
    },
    "/edit-pdf": {
        steps: [
            "Upload one PDF.",
            "Add new text, cover existing text with new wording, or draw freehand.",
            "Save and download the edited PDF.",
        ],
        notes: [
            "Replacing text places a white box over the original and writes the new text on top; the original text is covered, not rewritten.",
            "Added text uses standard Helvetica fonts.",
        ],
    },
    "/protect-pdf": {
        steps: [
            "Upload one PDF.",
            "Enter a password twice, or generate a strong one.",
            "Download the protected PDF. Anyone opening it will need the password.",
        ],
        notes: [
            "Keep the password somewhere safe — we don't store it and can't recover it.",
            "The file is encrypted with 128-bit RC4, which every PDF reader supports. For highly sensitive documents, consider stronger encryption software.",
        ],
    },
    "/unlock-pdf": {
        steps: [
            "Upload a password-protected PDF.",
            "Enter its current password.",
            "Download a copy that opens without a password.",
        ],
        notes: [
            "You need to know the password. The tool does not crack or bypass unknown passwords.",
            "PDFs encrypted with AES-256 or RC4 are supported; AES-128 is not yet.",
        ],
    },
    "/ocr-pdf": {
        steps: [
            "Upload a scanned or image-based PDF.",
            "Run OCR to extract the text.",
            "Copy the text, or download it as a TXT or PDF file.",
        ],
        notes: [
            "Text recognition is done by Google's Gemini AI. The PDF is uploaded to Gemini for this and deleted as soon as the text comes back.",
            "Results depend on scan quality. Check names, numbers and figures against the original.",
        ],
    },
    "/summarize-pdf": {
        steps: [
            "Upload one PDF.",
            "Generate the summary: up to five key points in under 150 words.",
            "Copy it, or download it as TXT or PDF.",
        ],
        notes: [
            "The document's text is sent to Google's Gemini AI to write the summary.",
            "Scanned PDFs have no readable text; run them through OCR PDF first.",
            "AI summaries can miss or misstate details. Check anything important against the document.",
        ],
    },
    "/translate": {
        steps: [
            "Upload one PDF.",
            "Choose the language to translate into (over 100 are available).",
            "Pick Text output to read and copy the translation, or PDF output to get a translated PDF that keeps the original layout.",
        ],
        notes: [
            "Translation is done by Google's Gemini AI, and right-to-left languages such as Arabic and Urdu are laid out correctly.",
            "Machine translation can be wrong about context or terminology; have important documents checked by a fluent speaker.",
        ],
    },
    "/grammar": {
        steps: [
            "Upload one PDF.",
            "Run the check to get a corrected version of the text.",
            "Switch between the corrected text and a word-by-word view of the changes, then copy the result.",
        ],
        notes: [
            "The checker corrects English grammar, spelling, punctuation and capitalisation without rewriting your style.",
            "The document's text is sent to Google's Gemini AI. Scanned PDFs need OCR first.",
        ],
    },
};
