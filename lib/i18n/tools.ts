import type { Locale } from "./messages";

/**
 * Tool names and descriptions, keyed by the tool's route.
 *
 * Kept apart from the interface catalogue because it is content rather than
 * chrome, and because the shape is one row per tool rather than one key per
 * string — twenty-two tools across eight languages is far more readable as a
 * table than as 352 separate keys.
 *
 * Each entry is [name, description]. A locale with no row for a tool falls
 * back to English, the same rule the rest of the app follows.
 */
type Pair = readonly [name: string, description: string];

export const TOOL_TEXT: Record<string, Partial<Record<Locale, Pair>>> = {
    "/merge-pdf": {
        en: ["Merge PDF", "Combine multiple PDF files into one."],
        es: ["Unir PDF", "Combina varios archivos PDF en uno."],
        fr: ["Fusionner PDF", "Combinez plusieurs fichiers PDF en un seul."],
        de: ["PDF zusammenfügen", "Mehrere PDF-Dateien zu einer verbinden."],
        pt: ["Juntar PDF", "Combine vários arquivos PDF em um só."],
        ar: ["دمج PDF", "ادمج عدة ملفات PDF في ملف واحد."],
        ur: ["PDF ضم کریں", "کئی PDF فائلوں کو ایک میں ملائیں۔"],
        zh: ["合并 PDF", "将多个 PDF 文件合并为一个。"],
    },
    "/split-pdf": {
        en: ["Split PDF", "Extract pages from any PDF."],
        es: ["Dividir PDF", "Extrae páginas de cualquier PDF."],
        fr: ["Diviser PDF", "Extrayez des pages de n'importe quel PDF."],
        de: ["PDF teilen", "Seiten aus jedem PDF extrahieren."],
        pt: ["Dividir PDF", "Extraia páginas de qualquer PDF."],
        ar: ["تقسيم PDF", "استخرج صفحات من أي ملف PDF."],
        ur: ["PDF تقسیم کریں", "کسی بھی PDF سے صفحات نکالیں۔"],
        zh: ["拆分 PDF", "从任意 PDF 中提取页面。"],
    },
    "/compress-pdf": {
        en: ["Compress PDF", "Reduce PDF file size quickly."],
        es: ["Comprimir PDF", "Reduce el tamaño del PDF rápidamente."],
        fr: ["Compresser PDF", "Réduisez rapidement la taille d'un PDF."],
        de: ["PDF komprimieren", "Die Dateigröße schnell verringern."],
        pt: ["Comprimir PDF", "Reduza o tamanho do PDF rapidamente."],
        ar: ["ضغط PDF", "قلّل حجم ملف PDF بسرعة."],
        ur: ["PDF کمپریس کریں", "PDF فائل کا حجم تیزی سے کم کریں۔"],
        zh: ["压缩 PDF", "快速减小 PDF 文件体积。"],
    },
    "/rotate-pdf": {
        en: ["Rotate PDF", "Rotate pages to the correct orientation."],
        es: ["Rotar PDF", "Gira las páginas a la orientación correcta."],
        fr: ["Pivoter PDF", "Orientez les pages correctement."],
        de: ["PDF drehen", "Seiten in die richtige Ausrichtung drehen."],
        pt: ["Girar PDF", "Gire as páginas para a orientação correta."],
        ar: ["تدوير PDF", "أدر الصفحات إلى الاتجاه الصحيح."],
        ur: ["PDF گھمائیں", "صفحات کو درست رخ پر گھمائیں۔"],
        zh: ["旋转 PDF", "将页面旋转到正确方向。"],
    },
    "/pdf-to-word": {
        en: ["PDF to Word", "Convert PDF into editable Word files."],
        es: ["PDF a Word", "Convierte PDF en archivos de Word editables."],
        fr: ["PDF en Word", "Convertissez un PDF en fichier Word modifiable."],
        de: ["PDF zu Word", "PDF in bearbeitbare Word-Dateien umwandeln."],
        pt: ["PDF para Word", "Converta PDF em arquivos Word editáveis."],
        ar: ["PDF إلى Word", "حوّل PDF إلى ملفات Word قابلة للتحرير."],
        ur: ["PDF سے Word", "PDF کو قابلِ ترمیم Word فائل میں بدلیں۔"],
        zh: ["PDF 转 Word", "将 PDF 转换为可编辑的 Word 文件。"],
    },
    "/word-to-pdf": {
        en: ["Word to PDF", "Convert Word documents into PDF."],
        es: ["Word a PDF", "Convierte documentos de Word en PDF."],
        fr: ["Word en PDF", "Convertissez des documents Word en PDF."],
        de: ["Word zu PDF", "Word-Dokumente in PDF umwandeln."],
        pt: ["Word para PDF", "Converta documentos Word em PDF."],
        ar: ["Word إلى PDF", "حوّل مستندات Word إلى PDF."],
        ur: ["Word سے PDF", "Word دستاویزات کو PDF میں بدلیں۔"],
        zh: ["Word 转 PDF", "将 Word 文档转换为 PDF。"],
    },
    "/pdf-to-image": {
        en: ["PDF to Image", "Convert PDF pages into images."],
        es: ["PDF a imagen", "Convierte páginas de PDF en imágenes."],
        fr: ["PDF en image", "Convertissez les pages d'un PDF en images."],
        de: ["PDF zu Bild", "PDF-Seiten in Bilder umwandeln."],
        pt: ["PDF para imagem", "Converta páginas de PDF em imagens."],
        ar: ["PDF إلى صورة", "حوّل صفحات PDF إلى صور."],
        ur: ["PDF سے تصویر", "PDF صفحات کو تصاویر میں بدلیں۔"],
        zh: ["PDF 转图片", "将 PDF 页面转换为图片。"],
    },
    "/image-to-pdf": {
        en: ["Image to PDF", "Convert images into a PDF file."],
        es: ["Imagen a PDF", "Convierte imágenes en un archivo PDF."],
        fr: ["Image en PDF", "Convertissez des images en fichier PDF."],
        de: ["Bild zu PDF", "Bilder in eine PDF-Datei umwandeln."],
        pt: ["Imagem para PDF", "Converta imagens em um arquivo PDF."],
        ar: ["صورة إلى PDF", "حوّل الصور إلى ملف PDF."],
        ur: ["تصویر سے PDF", "تصاویر کو PDF فائل میں بدلیں۔"],
        zh: ["图片转 PDF", "将图片转换为 PDF 文件。"],
    },
    "/pdf-to-excel": {
        en: ["PDF to Excel", "Convert PDF tables into spreadsheets."],
        es: ["PDF a Excel", "Convierte tablas de PDF en hojas de cálculo."],
        fr: ["PDF en Excel", "Convertissez les tableaux d'un PDF en feuilles de calcul."],
        de: ["PDF zu Excel", "PDF-Tabellen in Tabellenblätter umwandeln."],
        pt: ["PDF para Excel", "Converta tabelas de PDF em planilhas."],
        ar: ["PDF إلى Excel", "حوّل جداول PDF إلى جداول بيانات."],
        ur: ["PDF سے Excel", "PDF ٹیبلز کو اسپریڈشیٹ میں بدلیں۔"],
        zh: ["PDF 转 Excel", "将 PDF 表格转换为电子表格。"],
    },
    "/excel-to-pdf": {
        en: ["Excel to PDF", "Convert spreadsheets into PDFs."],
        es: ["Excel a PDF", "Convierte hojas de cálculo en PDF."],
        fr: ["Excel en PDF", "Convertissez des feuilles de calcul en PDF."],
        de: ["Excel zu PDF", "Tabellenblätter in PDF umwandeln."],
        pt: ["Excel para PDF", "Converta planilhas em PDF."],
        ar: ["Excel إلى PDF", "حوّل جداول البيانات إلى PDF."],
        ur: ["Excel سے PDF", "اسپریڈشیٹ کو PDF میں بدلیں۔"],
        zh: ["Excel 转 PDF", "将电子表格转换为 PDF。"],
    },
    "/pdf-to-ppt": {
        en: ["PDF to PPT", "Convert PDF into editable slides."],
        es: ["PDF a PPT", "Convierte PDF en diapositivas editables."],
        fr: ["PDF en PPT", "Convertissez un PDF en diapositives modifiables."],
        de: ["PDF zu PPT", "PDF in bearbeitbare Folien umwandeln."],
        pt: ["PDF para PPT", "Converta PDF em slides editáveis."],
        ar: ["PDF إلى PPT", "حوّل PDF إلى شرائح قابلة للتحرير."],
        ur: ["PDF سے PPT", "PDF کو قابلِ ترمیم سلائیڈز میں بدلیں۔"],
        zh: ["PDF 转 PPT", "将 PDF 转换为可编辑幻灯片。"],
    },
    "/ppt-to-pdf": {
        en: ["PPT to PDF", "Convert presentations into PDF."],
        es: ["PPT a PDF", "Convierte presentaciones en PDF."],
        fr: ["PPT en PDF", "Convertissez des présentations en PDF."],
        de: ["PPT zu PDF", "Präsentationen in PDF umwandeln."],
        pt: ["PPT para PDF", "Converta apresentações em PDF."],
        ar: ["PPT إلى PDF", "حوّل العروض التقديمية إلى PDF."],
        ur: ["PPT سے PDF", "پریزنٹیشنز کو PDF میں بدلیں۔"],
        zh: ["PPT 转 PDF", "将演示文稿转换为 PDF。"],
    },
    "/watermark-pdf": {
        en: ["Watermark PDF", "Add text or image watermarks."],
        es: ["Marca de agua", "Añade marcas de agua de texto o imagen."],
        fr: ["Filigrane PDF", "Ajoutez un filigrane texte ou image."],
        de: ["PDF-Wasserzeichen", "Text- oder Bild-Wasserzeichen hinzufügen."],
        pt: ["Marca d'água", "Adicione marcas d'água de texto ou imagem."],
        ar: ["علامة مائية", "أضف علامة مائية نصية أو صورة."],
        ur: ["واٹر مارک", "متن یا تصویر کا واٹر مارک شامل کریں۔"],
        zh: ["PDF 水印", "添加文字或图片水印。"],
    },
    "/sign-pdf": {
        en: ["Sign PDF", "Add digital signatures instantly."],
        es: ["Firmar PDF", "Añade firmas digitales al instante."],
        fr: ["Signer PDF", "Ajoutez une signature en un instant."],
        de: ["PDF signieren", "Digitale Unterschriften sofort hinzufügen."],
        pt: ["Assinar PDF", "Adicione assinaturas digitais na hora."],
        ar: ["توقيع PDF", "أضف توقيعًا رقميًا على الفور."],
        ur: ["PDF دستخط", "فوری طور پر ڈیجیٹل دستخط شامل کریں۔"],
        zh: ["签署 PDF", "即时添加电子签名。"],
    },
    "/edit-pdf": {
        en: ["Edit PDF", "Edit text and images inside PDFs."],
        es: ["Editar PDF", "Edita texto e imágenes dentro del PDF."],
        fr: ["Modifier PDF", "Modifiez le texte et les images d'un PDF."],
        de: ["PDF bearbeiten", "Text und Bilder im PDF bearbeiten."],
        pt: ["Editar PDF", "Edite texto e imagens dentro do PDF."],
        ar: ["تحرير PDF", "حرّر النصوص والصور داخل ملفات PDF."],
        ur: ["PDF ترمیم", "PDF کے اندر متن اور تصاویر میں ترمیم کریں۔"],
        zh: ["编辑 PDF", "编辑 PDF 中的文字和图片。"],
    },
    "/protect-pdf": {
        en: ["Protect PDF", "Encrypt PDF files with passwords."],
        es: ["Proteger PDF", "Cifra archivos PDF con contraseña."],
        fr: ["Protéger PDF", "Chiffrez vos PDF par mot de passe."],
        de: ["PDF schützen", "PDF-Dateien mit Passwort verschlüsseln."],
        pt: ["Proteger PDF", "Criptografe arquivos PDF com senha."],
        ar: ["حماية PDF", "شفّر ملفات PDF بكلمة مرور."],
        ur: ["PDF محفوظ کریں", "PDF فائلوں کو پاس ورڈ سے محفوظ کریں۔"],
        zh: ["加密 PDF", "为 PDF 文件设置密码。"],
    },
    "/unlock-pdf": {
        en: ["Unlock PDF", "Remove password protection."],
        es: ["Desbloquear PDF", "Elimina la protección por contraseña."],
        fr: ["Déverrouiller PDF", "Supprimez la protection par mot de passe."],
        de: ["PDF entsperren", "Passwortschutz entfernen."],
        pt: ["Desbloquear PDF", "Remova a proteção por senha."],
        ar: ["فتح PDF", "أزل الحماية بكلمة المرور."],
        ur: ["PDF انلاک کریں", "پاس ورڈ کی حفاظت ہٹائیں۔"],
        zh: ["解锁 PDF", "移除密码保护。"],
    },
    "/ocr-pdf": {
        en: ["OCR PDF", "Extract text from scanned PDFs."],
        es: ["OCR de PDF", "Extrae texto de PDF escaneados."],
        fr: ["OCR PDF", "Extrayez le texte des PDF numérisés."],
        de: ["PDF-OCR", "Text aus gescannten PDFs auslesen."],
        pt: ["OCR de PDF", "Extraia texto de PDFs digitalizados."],
        ar: ["التعرف الضوئي", "استخرج النص من ملفات PDF الممسوحة."],
        ur: ["OCR PDF", "اسکین شدہ PDF سے متن نکالیں۔"],
        zh: ["PDF 文字识别", "从扫描的 PDF 中提取文字。"],
    },
    "/summarize-pdf": {
        en: ["AI Summary", "Generate document summaries instantly."],
        es: ["Resumen con IA", "Genera resúmenes de documentos al instante."],
        fr: ["Résumé IA", "Générez des résumés de documents instantanément."],
        de: ["KI-Zusammenfassung", "Dokumente sofort zusammenfassen."],
        pt: ["Resumo com IA", "Gere resumos de documentos na hora."],
        ar: ["ملخص بالذكاء الاصطناعي", "أنشئ ملخصات للمستندات فورًا."],
        ur: ["AI خلاصہ", "دستاویزات کا فوری خلاصہ بنائیں۔"],
        zh: ["AI 摘要", "即时生成文档摘要。"],
    },
    "/translate": {
        en: ["Translate PDF", "Translate your documents."],
        es: ["Traducir PDF", "Traduce tus documentos."],
        fr: ["Traduire PDF", "Traduisez vos documents."],
        de: ["PDF übersetzen", "Übersetzen Sie Ihre Dokumente."],
        pt: ["Traduzir PDF", "Traduza seus documentos."],
        ar: ["ترجمة PDF", "ترجم مستنداتك."],
        ur: ["PDF ترجمہ", "اپنی دستاویزات کا ترجمہ کریں۔"],
        zh: ["翻译 PDF", "翻译您的文档。"],
    },
    "/grammar": {
        en: ["Grammar Checker", "Check grammar and spelling of your documents."],
        es: ["Corrector gramatical", "Revisa la gramática y ortografía de tus documentos."],
        fr: ["Correcteur grammatical", "Vérifiez la grammaire et l'orthographe de vos documents."],
        de: ["Grammatikprüfung", "Grammatik und Rechtschreibung Ihrer Dokumente prüfen."],
        pt: ["Corretor gramatical", "Verifique a gramática e a ortografia dos seus documentos."],
        ar: ["مدقق القواعد", "دقّق قواعد وإملاء مستنداتك."],
        ur: ["گرامر چیکر", "اپنی دستاویزات کی گرامر اور املا جانچیں۔"],
        zh: ["语法检查", "检查文档的语法和拼写。"],
    },
};

/** Category filter labels, which sit alongside the tool cards. */
export const CATEGORY_TEXT: Record<string, Partial<Record<Locale, string>>> = {
    "All Tools": {
        en: "All Tools", es: "Todas", fr: "Tous les outils", de: "Alle Werkzeuge",
        pt: "Todas", ar: "كل الأدوات", ur: "تمام ٹولز", zh: "全部工具",
    },
    All: {
        en: "All", es: "Todos", fr: "Tous", de: "Alle",
        pt: "Todos", ar: "الكل", ur: "سب", zh: "全部",
    },
    Organize: {
        en: "Organize", es: "Organizar", fr: "Organiser", de: "Organisieren",
        pt: "Organizar", ar: "تنظيم", ur: "ترتیب", zh: "整理",
    },
    Edit: {
        en: "Edit", es: "Editar", fr: "Modifier", de: "Bearbeiten",
        pt: "Editar", ar: "تحرير", ur: "ترمیم", zh: "编辑",
    },
    Convert: {
        en: "Convert", es: "Convertir", fr: "Convertir", de: "Umwandeln",
        pt: "Converter", ar: "تحويل", ur: "تبدیل", zh: "转换",
    },
    Security: {
        en: "Security", es: "Seguridad", fr: "Sécurité", de: "Sicherheit",
        pt: "Segurança", ar: "الأمان", ur: "سیکیورٹی", zh: "安全",
    },
    "AI Tools": {
        en: "AI Tools", es: "Herramientas IA", fr: "Outils IA", de: "KI-Werkzeuge",
        pt: "Ferramentas de IA", ar: "أدوات الذكاء الاصطناعي", ur: "AI ٹولز", zh: "AI 工具",
    },
};

/** Badge shown on a featured tool. */
export const BADGE_TEXT: Record<string, Partial<Record<Locale, string>>> = {
    Popular: {
        en: "Popular", es: "Popular", fr: "Populaire", de: "Beliebt",
        pt: "Popular", ar: "شائع", ur: "مقبول", zh: "热门",
    },
    Soon: {
        en: "Soon", es: "Pronto", fr: "Bientôt", de: "Bald",
        pt: "Em breve", ar: "قريبًا", ur: "جلد", zh: "即将推出",
    },
};
