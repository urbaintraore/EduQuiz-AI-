import React, { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Image } from "@tiptap/extension-image";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";

import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
  Calculator,
  Eye,
  Code,
  Sparkles,
  ChevronDown,
  UploadCloud,
  Heading1,
  Heading2,
  Trash,
  HelpCircle,
  Undo2,
  Redo2,
  BookOpen
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Helper to convert HTML to standard LaTeX/Moodle Markdown
export function htmlToMoodleMarkdown(html: string): string {
  if (!html) return "";

  let doc = html;

  // Let's replace headers
  doc = doc.replace(/<h1>(.*?)<\/h1>/gi, "\n# $1\n");
  doc = doc.replace(/<h2>(.*?)<\/h2>/gi, "\n## $1\n");
  doc = doc.replace(/<h3>(.*?)<\/h3>/gi, "\n### $1\n");

  // Bold / Strong
  doc = doc.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  doc = doc.replace(/<b>(.*?)<\/b>/gi, "**$1**");

  // Italic / Em
  doc = doc.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  doc = doc.replace(/<i>(.*?)<\/i>/gi, "*$1*");

  // Code / Mono
  doc = doc.replace(/<code>(.*?)<\/code>/gi, "`$1`");

  // Unordered list
  doc = doc.replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, body) => {
    return "\n" + body.replace(/<li>(.*?)<\/li>/gi, "- $1\n").trim() + "\n";
  });

  // Ordered list
  doc = doc.replace(/<ol>([\s\S]*?)<\/ol>/gi, (match, body) => {
    let index = 1;
    return "\n" + body.replace(/<li>(.*?)<\/li>/gi, () => `${index++}. $1\n`).trim() + "\n";
  });

  // Table handling
  doc = doc.replace(/<table>([\s\S]*?)<\/table>/gi, (match, body) => {
    const rows: string[][] = [];
    // Extract rows manually
    const rowMatches = body.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
    rowMatches.forEach((rowMatch: string) => {
      const cells: string[] = [];
      const cellMatches = rowMatch.match(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi) || [];
      cellMatches.forEach((cellMatch: string) => {
        const text = cellMatch.replace(/<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi, "$2").trim();
        cells.push(text);
      });
      if (cells.length > 0) rows.push(cells);
    });

    if (rows.length === 0) return "";
    let markdownTable = "\n";
    // Header
    markdownTable += "| " + rows[0].join(" | ") + " |\n";
    // Divider
    markdownTable += "| " + rows[0].map(() => "---").join(" | ") + " |\n";
    // Rows
    for (let i = 1; i < rows.length; i++) {
      markdownTable += "| " + rows[i].join(" | ") + " |\n";
    }
    return markdownTable + "\n";
  });

  // Image handling
  doc = doc.replace(/<img[^>]+src="([^">]+)"[^>]*>/gi, "![image]($1)");

  // Paragraph tags replace with simple clean newline separation
  doc = doc.replace(/<p>(.*?)<\/p>/gi, "$1\n");
  doc = doc.replace(/<br\s*\/?>/gi, "\n");

  // Clean double newlines
  doc = doc.replace(/\n{3,}/g, "\n\n");

  // Clean HTML tags that might be remaining
  doc = doc.replace(/<[^>]*>/g, "");

  return doc.trim();
}

// Convert Moodle Markdown containing LaTeX math to HTML
export function moodleMarkdownToHtml(md: string): string {
  if (!md) return "<p></p>";

  let html = md;

  // Protect mathematical expressions by encoding them temporarily
  const mathBlocks: string[] = [];
  const mathInlines: string[] = [];

  // Protect block math $$
  html = html.replace(/(\$\$[\s\S]*?\$\$)/g, (match) => {
    mathBlocks.push(match);
    return `###MATHBLOCK_${mathBlocks.length - 1}###`;
  });

  // Protect inline math $
  html = html.replace(/(\$[\s\S]*?\$)/g, (match) => {
    mathInlines.push(match);
    return `###MATHINLINE_${mathInlines.length - 1}###`;
  });

  // Standard Markdown parsing
  // Headers
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$2</h2>");
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Table Markdown to HTML
  html = html.replace(/((?:\|[^\n]*\|(?:\n|$))+)/g, (match) => {
    const lines = match.trim().split("\n");
    if (lines.length < 2) return match;
    let tableHtml = "<table>";
    lines.forEach((line, idx) => {
      if (line.includes("---")) return;
      const cells = line.split("|").map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
      tableHtml += "<tr>";
      cells.forEach(cell => {
        const tag = idx === 0 ? "th" : "td";
        tableHtml += `<${tag}>${cell}</${tag}>`;
      });
      tableHtml += "</tr>";
    });
    tableHtml += "</table>";
    return tableHtml;
  });

  // Lists
  html = html.replace(/^\s*-\s+(.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Wrap non-block lines in paragraphs
  const lines = html.split("\n");
  let parsedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("<h") || trimmed.startsWith("<table") || trimmed.startsWith("<tr") || trimmed.startsWith("<td") || trimmed.startsWith("<th") || trimmed.startsWith("<li") || trimmed.startsWith("<ul>") || trimmed.startsWith("</ul>") || trimmed.startsWith("<ol>")) {
      return line;
    }
    if (trimmed === "") return "";
    return `<p>${line}</p>`;
  });
  html = parsedLines.join("\n");

  // Unprotect math
  mathBlocks.forEach((math, idx) => {
    html = html.replace(`###MATHBLOCK_${idx}###`, math);
  });

  mathInlines.forEach((math, idx) => {
    html = html.replace(`###MATHINLINE_${idx}###`, math);
  });

  return html;
}

// Dedicated math renderer for the live scientific preview
function InlineMathRenderer({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  const parts = text.split(/(\$\$.*?\$\$)/gs);

  return (
    <div className={`prose prose-indigo max-w-none text-slate-700 leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const formula = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
            return (
              <div
                key={index}
                className="my-4 overflow-x-auto text-center font-serif text-[15px] bg-slate-50 p-4 rounded-xl border border-slate-200/50 shadow-xs"
                dangerouslySetInnerHTML={{ __html: html }}
                id={`math-block-${index}`}
              />
            );
          } catch (e) {
            return <code key={index} className="block my-2 text-rose-500 bg-rose-50 p-2 rounded">{formula}</code>;
          }
        } else {
          const inlineParts = part.split(/(\$.*?\$)/g);
          return (
            <span key={index}>
              {inlineParts.map((subPart, subIndex) => {
                if (subPart.startsWith("$") && subPart.endsWith("$")) {
                  const formula = subPart.slice(1, -1).trim();
                  try {
                    const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
                    return (
                      <span
                        key={subIndex}
                        className="inline-block px-1 align-middle font-serif text-indigo-900 font-bold"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    );
                  } catch (e) {
                    return <code key={subIndex} className="text-rose-500 font-mono text-xs">${formula}$</code>;
                  }
                }
                const subLines = subPart.split("\n");
                return subLines.map((line, lidx) => (
                  <React.Fragment key={lidx}>
                    {line}
                    {lidx < subLines.length - 1 && <br />}
                  </React.Fragment>
                ));
              })}
            </span>
          );
        }
      })}
    </div>
  );
}

const MATH_TEMPLATES = [
  {
    category: "Algèbre / Fonctions",
    items: [
      { label: "Fraction", code: "\\frac{a}{b}", desc: "Fraction: a divisé par b" },
      { label: "Puissance", code: "x^{2}", desc: "Exposant / Puissance" },
      { label: "Indice", code: "x_{n}", desc: "Indice inférieur" },
      { label: "Racine", code: "\\sqrt{x}", desc: "Racine carrée" },
      { label: "Log", code: "\\ln(x)", desc: "Logarithme népérien" },
      { label: "Réels", code: "\\mathbb{R}", desc: "Ensemble des réels" }
    ]
  },
  {
    category: "Calcul / Limites",
    items: [
      { label: "Intégrale", code: "\\int_{a}^{b} f(x) \\, dx", desc: "Intégrale définie" },
      { label: "Somme", code: "\\sum_{i=1}^{n} x_i", desc: "Somme d'éléments" },
      { label: "Limite", code: "\\lim_{x \\to \\infty} f(x)", desc: "Limite vers l'infini" },
      { label: "Dérivée", code: "\\frac{df}{dx}", desc: "Notation d'équations" },
      { label: "Vecteur", code: "\\vec{u}", desc: "Vecteur" }
    ]
  },
  {
    category: "Matrices / Systèmes",
    items: [
      { label: "Matrice 2x2", code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", desc: "Matrice 2x2" },
      { label: "Système 2 Éq.", code: "\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}", desc: "Système de 2 équations" }
    ]
  },
  {
    category: "Grec / Symboles",
    items: [
      { label: "Alpha", code: "\\alpha", desc: "Alpha" },
      { label: "Bêta", code: "\\beta", desc: "Beta" },
      { label: "Thêta", code: "\\theta", desc: "Theta" },
      { label: "Pi", code: "\\pi", desc: "Pi" },
      { label: "Delta", code: "\\Delta", desc: "Delta" },
      { label: "Infini", code: "\\infty", desc: "Infini" },
      { label: "Pour tout", code: "\\forall", desc: "Séquenceur pour tout" },
      { label: "Existe", code: "\\exists", desc: "Il existe" },
      { label: "Différent", code: "\\neq", desc: "Inégalité" }
    ]
  }
];

const MOODLE_SNIPPETS = [
  {
    title: "Sujet QCM Standard",
    content: "Soit la fonction $f(x) = 3x^2 - 5x + 2$ définie sur $\\mathbb{R}$.\nQuelle est l'expression de sa dérivée $f'(x)$ ?\n\na) $f'(x) = 3x - 5$\nb) $f'(x) = 6x - 5$\nc) $f'(x) = 6x^2 - 5$"
  },
  {
    title: "Équation Différentielle",
    content: "On considère l'équation différentielle du second ordre suivante :\n$$y'' + 4y' + 3y = 5e^{-2x}$$\n\n1. Déterminer la solution générale de l'équation homogène associée."
  }
];

interface ScientificRichEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  onUploadClick?: () => void;
  hasUpload?: boolean;
  uploadLabel?: string;
  extractionType?: "subject" | "solution" | "general";
}

export function ScientificRichEditor({
  value,
  onChange,
  placeholder = "Saisissez votre contenu...",
  rows = 5,
  label,
  onUploadClick,
  hasUpload = false,
  uploadLabel = "Transcrire sujet par l'IA"
}: ScientificRichEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "visual">("visual");
  const [activeMathCategory, setActiveMathCategory] = useState<number>(0);
  const [showFormulaPalette, setShowFormulaPalette] = useState(false);
  const [latexVisualInput, setLatexVisualInput] = useState("");
  const [latexIsBlock, setLatexIsBlock] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState("Inter");

  // Auto-recovery draft storage keys based on label/placeholder
  const draftKey = `eduquiz_draft_${(label || placeholder || "default").replace(/\s+/g, "_").toLowerCase()}`;

  // Real-time automatic drafts backing up
  useEffect(() => {
    if (value && value.trim().length > 0) {
      localStorage.setItem(draftKey, value);
    }
  }, [value, draftKey]);

  // Handle crash recovery triggered by ErrorBoundary
  useEffect(() => {
    try {
      const isRestorePending = localStorage.getItem("eduquiz_restore_pending") === "true";
      if (isRestorePending) {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft && savedDraft.trim() !== value.trim()) {
          console.log(`[Autorecover] Reclaiming draft state for: ${label || placeholder}`);
          onChange(savedDraft);
          // Set timeout to safely remove pending state after all editor elements have handled it
          const timer = setTimeout(() => {
            localStorage.removeItem("eduquiz_restore_pending");
          }, 4000);
          return () => clearTimeout(timer);
        }
      }
    } catch (recoveryErr) {
      console.error("Session recovery failed for ScientificRichEditor:", recoveryErr);
    }
  }, [draftKey, onChange, label, placeholder, value]);

  // Create local reference for uploading image directly in editor
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      TextStyle,
      FontFamily,
    ],
    content: moodleMarkdownToHtml(value),
    onUpdate: ({ editor }) => {
      const htmlOutput = editor.getHTML();
      const markdown = htmlToMoodleMarkdown(htmlOutput);
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm focus:outline-none max-w-none p-4 min-h-[140px] select-text bg-white text-slate-800 text-sm leading-relaxed",
        id: "tiptap-editor-element",
      },
    },
  });

  // Keep Tiptap content in sync with external value when tab switches or file is uploaded
  useEffect(() => {
    if (!editor) return;
    
    // Skip syncing if the editor is focused to prevent cursor jumping when deleting/modifying text
    if (editor.isFocused) return;
    
    const currentHtml = editor.getHTML();
    const convertedFromValue = moodleMarkdownToHtml(value);
    
    // Only set if different to preserve cursor state
    if (htmlToMoodleMarkdown(currentHtml) !== htmlToMoodleMarkdown(convertedFromValue)) {
      editor.commands.setContent(convertedFromValue);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  // Formatting operations
  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleHeading1 = () => editor.chain().focus().toggleHeading({ level: 1 }).run();
  const toggleHeading2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  
  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run();
  };

  const handleFontChange = (font: string) => {
    setFontFamily(font);
    editor.chain().focus().setFontFamily(font).run();
  };

  // Image upload base64 conversion
  const handleImageUploadedInEditor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Src = event.target?.result as string;
      if (base64Src) {
        editor.chain().focus().setImage({ src: base64Src, alt: file.name }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  // Safe visual formula insertion
  const insertVisualFormula = () => {
    if (!latexVisualInput.trim()) return;
    const finalFormula = latexIsBlock
      ? `$$${latexVisualInput.trim()}$$`
      : `$${latexVisualInput.trim()}$`;
    
    // Insert text directly at cursor in editor
    editor.chain().focus().insertContent(finalFormula).run();
    setLatexVisualInput("");
    setShowFormulaPalette(false);
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500" id={"scientific-rich-editor"}>
      {/* Dynamic Selector of Fonts, Upload File and Tabs */}
      <div className="bg-slate-50/75 border-b border-slate-100 p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === "visual"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            id={"tab-visual"}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Éditeur Visuel (WYSIWYG)</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === "edit"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            id={"tab-latex"}
          >
            <Code className="w-3.5 h-3.5 text-purple-500" />
            <span>Texte Brut / LaTeX</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === "preview"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            id={"tab-pdf-preview"}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span>Rendu Universitaire Moodle</span>
          </button>
        </div>

        {/* Action icons / buttons */}
        <div className="flex items-center space-x-1">
          {hasUpload && onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              className="cursor-pointer flex items-center space-x-1.5 text-indigo-700 hover:text-indigo-800 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100 px-3 py-1.5 rounded-lg transition-all"
              id={"btn-transcribe-ia"}
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
              <span>{uploadLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ribbon format bar for WYSIWYG mode */}
      {activeTab === "visual" && (
        <div className="bg-slate-50/50 border-b border-slate-100 p-2 flex flex-wrap items-center gap-1.5 select-none" id={"floating-format-panel"}>
          {/* Font selection */}
          <select
            value={fontFamily}
            onChange={(e) => handleFontChange(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium text-slate-700 focus:outline-none"
            id={"select-font-family"}
          >
            <option value="Inter">Police: Inter (Sans)</option>
            <option value="Space Grotesk">Police: Space Grotesk</option>
            <option value="Playfair Display">Police: Apparat (Serif)</option>
            <option value="Fira Code">Police: JetBrains Mono</option>
          </select>

          <div className="h-4 w-px bg-slate-200."></div>

          {/* Core tools */}
          <button
            type="button"
            onClick={toggleBold}
            className={`p-1.5 rounded-lg transition ${editor.isActive("bold") ? "bg-indigo-100 text-indigo-800" : "hover:bg-slate-100 text-slate-600"}`}
            title="Gras"
            id={"btn-bold"}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleItalic}
            className={`p-1.5 rounded-lg transition ${editor.isActive("italic") ? "bg-indigo-100 text-indigo-800" : "hover:bg-slate-100 text-slate-600"}`}
            title="Italique"
            id={"btn-italic"}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleHeading1}
            className={`p-1.5 rounded-lg transition ${editor.isActive("heading", { level: 1 }) ? "bg-indigo-100 text-indigo-800" : "hover:bg-slate-100 text-slate-600"}`}
            title="Titre 1"
            id={"btn-h1"}
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleHeading2}
            className={`p-1.5 rounded-lg transition ${editor.isActive("heading", { level: 2 }) ? "bg-indigo-100 text-indigo-800" : "hover:bg-slate-100 text-slate-600"}`}
            title="Titre 2"
            id={"btn-h2"}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200"></div>

          {/* Lists */}
          <button
            type="button"
            onClick={toggleBulletList}
            className={`p-1.5 rounded-lg transition ${editor.isActive("bulletList") ? "bg-indigo-100 text-indigo-800" : "hover:bg-slate-100 text-slate-600"}`}
            title="Liste à puces"
            id={"btn-bullet-list"}
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleOrderedList}
            className={`p-1.5 rounded-lg transition ${editor.isActive("orderedList") ? "bg-indigo-100 text-indigo-800" : "hover:bg-slate-100 text-slate-600"}`}
            title="Liste ordonnée"
            id={"btn-ordered-list"}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200"></div>

          {/* Tables operations */}
          <button
            type="button"
            onClick={insertTable}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition flex items-center space-x-1"
            title="Insérer Tableau"
            id={"btn-insert-table"}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Tableau</span>
          </button>

          {editor.isActive("table") && (
            <button
              type="button"
              onClick={deleteTable}
              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition flex items-center space-x-1"
              title="Supprimer Tableau"
              id={"btn-delete-table"}
            >
              <Trash className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Suppr.</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200"></div>

          {/* File input and image insertion */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUploadedInEditor}
            className="hidden"
            accept="image/*"
            id={"file-input-image"}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition flex items-center space-x-1"
            title="Insérer une image locale"
            id={"btn-insert-image"}
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold">Image</span>
          </button>

          {/* LaTeX Equations visual helper */}
          <button
            type="button"
            onClick={() => setShowFormulaPalette(!showFormulaPalette)}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold ${
              showFormulaPalette
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
            title="Clavier Mathématique Virtuel LaTeX"
            id={"btn-formula-palette"}
          >
            <Calculator className="w-3.5 h-3.5 text-purple-600 group-hover:text-white" />
            <span className="text-[10px] font-bold">Visual Math LaTeX</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showFormulaPalette ? "rotate-180" : ""}`} />
          </button>
          
          <div className="ml-auto flex items-center space-x-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              className="p-1 hover:bg-slate-100 rounded text-slate-500"
              title="Undo"
              id={"btn-undo"}
            >
              <Undo2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              className="p-1 hover:bg-slate-100 rounded text-slate-500"
              title="Redo"
              id={"btn-redo"}
            >
              <Redo2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Formula keyboard palette (expandable widget) with visual preview and LaTeX builder */}
      {showFormulaPalette && (
        <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border-b border-indigo-100 p-3.5 fade-in select-none" id={"formula-keyboard-palette"}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-bold text-indigo-700 tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-500" />
              Saisie Guidée d'Équations Scientifiques (Format Moodle & LaTeX)
            </span>
            <button
              type="button"
              onClick={() => setShowFormulaPalette(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold bg-white px-2 py-1 rounded-md border border-slate-200"
              id={"btn-close-palette"}
            >
              Fermer
            </button>
          </div>

          {/* Custom Visual Math Input with Instant Preview */}
          <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-3xs mb-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={latexVisualInput}
                  onChange={(e) => setLatexVisualInput(e.target.value)}
                  placeholder="Saisissez ou modifiez votre LaTeX ici (ex: \\int_{0}^{\\pi} \\sin(x) \\, dx)"
                  className="flex-1 min-w-[280px] text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  id={"input-latex-formula"}
                />
                
                <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-600 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={latexIsBlock}
                    onChange={(e) => setLatexIsBlock(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    id={"checkbox-latex-is-block"}
                  />
                  <span>Centré (Bloc $$)</span>
                </label>
              </div>

              <button
                type="button"
                onClick={insertVisualFormula}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 select-all"
                id={"btn-insert-formula-to-app"}
              >
                <Sparkles className="w-3 h-3" />
                Insérer au curseur
              </button>
            </div>

            {/* Instant Render Box */}
            {latexVisualInput.trim() && (
              <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="text-[10px] text-slate-400 font-mono shrink-0">Aperçu :</div>
                <div className="flex-1 text-center py-2">
                  <InlineMathRenderer text={latexIsBlock ? `$$${latexVisualInput}$$` : `$${latexVisualInput}$`} />
                </div>
              </div>
            )}
          </div>

          {/* Categories Tab Selector */}
          <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 mb-2">
            {MATH_TEMPLATES.map((cat, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveMathCategory(idx)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition ${
                  activeMathCategory === idx
                    ? "bg-indigo-100 text-indigo-800"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
                id={`math-cat-${idx}`}
              >
                {cat.category}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-300 mx-1 align-middle self-center"></div>

            <span className="text-[10px] text-slate-400 py-1 font-semibold">Exemples :</span>
            {MOODLE_SNIPPETS.map((snip, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (activeTab === "visual") {
                    editor.chain().focus().insertContent(snip.content).run();
                  } else {
                    onChange(value + "\n" + snip.content);
                  }
                  setCopiedSnippet(snip.title);
                  setTimeout(() => setCopiedSnippet(null), 2000);
                }}
                className="text-[10px] px-2 py-0.5 border border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded transition font-medium flex items-center gap-1"
                title="Insérer ce modèle entier"
                id={`snippet-${index}`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {copiedSnippet === snip.title ? "Inséré !" : snip.title}
              </button>
            ))}
          </div>

          {/* Group Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200/50">
            {MATH_TEMPLATES[activeMathCategory].items.map((item, id) => (
              <button
                key={id}
                type="button"
                onClick={() => setLatexVisualInput(prev => prev + item.code)}
                className="group flex flex-col items-center justify-between p-2 rounded-md hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 text-center transition"
                title={item.desc}
                id={`math-template-item-${id}`}
              >
                <span className="text-[10px] text-slate-400 block font-normal mb-1">{item.label}</span>
                <span className="font-serif text-[12px] text-indigo-900 font-bold block bg-slate-50 px-1 py-0.5 rounded group-hover:bg-white w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {item.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor Body depending on active tab */}
      <div className="relative">
        {activeTab === "visual" && (
          <div className="border-t border-slate-100 relative group">
            {/* Elegant Floating Tools Panel (FloatingMenu) above the visual editing zone */}
            <div 
              className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg border border-slate-800 text-white opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-all duration-300 pointer-events-auto shrink-0"
              id="wysiwyg-floating-menu"
            >
              <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wide mr-1 border-r border-slate-800 pr-2 select-none">Menu Flottant</span>
              
              <button
                type="button"
                onClick={toggleBold}
                className={`p-1 rounded-md transition ${editor.isActive("bold") ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"}`}
                title="Gras"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={toggleItalic}
                className={`p-1 rounded-md transition ${editor.isActive("italic") ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"}`}
                title="Italique"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={toggleHeading1}
                className={`p-1 rounded-md transition ${editor.isActive("heading", { level: 1 }) ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"}`}
                title="Titre 1"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={toggleHeading2}
                className={`p-1 rounded-md transition ${editor.isActive("heading", { level: 2 }) ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"}`}
                title="Titre 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={toggleBulletList}
                className={`p-1 rounded-md transition ${editor.isActive("bulletList") ? "bg-indigo-600 text-white" : "text-slate-300 hover:text-white"}`}
                title="Liste"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <div className="h-3.5 w-px bg-slate-800 select-none"></div>

              <button
                type="button"
                onClick={insertTable}
                className="p-1 rounded-md hover:text-white text-slate-300 transition"
                title="Insérer un tableau"
              >
                <TableIcon className="w-3.5 h-3.5 text-sky-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFormulaPalette(!showFormulaPalette);
                  setTimeout(() => {
                    document.getElementById("input-latex-formula")?.focus();
                  }, 150);
                }}
                className={`p-1 px-2 rounded-full flex items-center gap-1 text-[10px] font-bold ${
                  showFormulaPalette ? "bg-purple-600 text-white" : "text-purple-300 hover:text-white hover:bg-slate-800"
                }`}
                title="Rédiger avec l'Éditeur LaTeX"
              >
                <Calculator className="w-3 h-3 text-purple-400" />
                <span>LaTeX</span>
              </button>
            </div>

            {/* Content area padded to avoid overlay clash */}
            <div className="pt-8">
              <EditorContent editor={editor} />
            </div>
          </div>
        )}

        {activeTab === "edit" && (
          <div>
            <textarea
              rows={rows}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full p-4 text-[13px] font-mono text-slate-700 bg-white border-none outline-none resize-y leading-relaxed focus:ring-0 min-h-[140px]"
              id={"raw-latex-textarea"}
            />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded font-mono pointer-events-none select-none">
              Mode Code LaTeX brut : utilisez $...$ ou $$...$$
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="p-5 bg-slate-50/60 min-h-[140px] max-h-[350px] overflow-y-auto border-t border-slate-100" id={"preview-scientific-render"}>
            {value.trim() ? (
              <InlineMathRenderer text={value} />
            ) : (
              <span className="text-xs text-slate-400 italic">Rien à prévisualiser pour l'instant. Saisissez du texte ou des formules LaTeX.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
