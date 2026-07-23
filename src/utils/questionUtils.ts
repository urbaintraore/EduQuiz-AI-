import { Question } from '../types';

/**
 * Helper to extract pairs from arbitrary text containing separators like ->, =>, ::, ➡️, etc.
 */
function extractPairsFromText(text: string): { keys: string[]; values: string[] } {
  const keys: string[] = [];
  const values: string[] = [];
  if (!text) return { keys, values };

  // Split by common delimiters (newline, comma, vertical pipe, semicolon)
  const segments = text.split(/\r?\n|\||,|;/);
  for (let segment of segments) {
    segment = segment.trim();
    if (!segment) continue;

    // Regex matching: left_part SEPARATOR right_part
    // SEPARATOR can be ->, =>, ::, =, ➡️, or :
    const match = segment.match(/^[^a-zA-Z0-9]*([^:=>\-➡️\n]+?)\s*(?:->|=>|::|➡️|=)\s*([^:=>\-➡️\n]+)/);
    if (match) {
      const left = match[1].replace(/^[•*\s-\d)]+/, "").trim(); // strip bullets, numbers, dashes
      const right = match[2].trim();
      
      if (left && right && left.length < 100 && right.length < 100) {
        const lowerLeft = left.toLowerCase();
        // Skip common words or headings
        if (
          !lowerLeft.includes("correct") &&
          !lowerLeft.includes("associ") &&
          !lowerLeft.includes("réponse") &&
          !lowerLeft.includes("solution") &&
          !lowerLeft.includes("explication") &&
          !lowerLeft.includes("appariement")
        ) {
          if (!keys.includes(left)) {
            keys.push(left);
            values.push(right);
          }
        }
      }
    }
  }
  return { keys, values };
}

/**
 * Normalizes a matching question so that left column options and right column targets
 * are clean and non-empty, even if AI generated them as "Key -> Value" in options or omitted matchingTargets.
 */
export function normalizeMatchingQuestion(q: Partial<Question>): { options: string[]; matchingTargets: string[] } {
  let opts = Array.isArray(q.options) ? q.options.map(s => String(s || "").trim()).filter(Boolean) : [];
  let targets = Array.isArray(q.matchingTargets) ? q.matchingTargets.map(s => String(s || "").trim()).filter(Boolean) : [];

  // 1. If options is empty, try to extract pairs from statement, correctAnswer, and explanation
  if (opts.length === 0) {
    const combined = `${q.correctAnswer || ""} ${q.explanation || ""} ${q.statement || ""}`;
    const extracted = extractPairsFromText(combined);
    if (extracted.keys.length > 0) {
      opts = extracted.keys;
      targets = extracted.values;
    }
  }

  // 2. If options has elements but targets is empty or shorter, see if we have separators in options
  const hasSeparators = opts.some(opt => /^.+?\s*(?:->|=>|::|➡️|=)\s*.+$/.test(opt));
  if (hasSeparators || targets.length === 0) {
    const parsedKeys: string[] = [];
    const parsedTargets: string[] = [];

    opts.forEach((opt, idx) => {
      const match = opt.match(/^(.+?)\s*(?:->|=>|::|➡️|=)\s*(.+)$/);
      if (match) {
        parsedKeys.push(match[1].trim());
        parsedTargets.push(match[2].trim());
      } else {
        parsedKeys.push(opt);
        if (targets[idx]) {
          parsedTargets.push(targets[idx]);
        }
      }
    });

    if (parsedTargets.length > 0) {
      opts = parsedKeys;
      targets = parsedTargets;
    }
  }

  // 3. If targets is still shorter than opts, try to find missing matches in correctAnswer or explanation
  if (targets.length < opts.length && opts.length > 0) {
    const combined = `${q.correctAnswer || ""} ${q.explanation || ""}`;
    const extracted = extractPairsFromText(combined);
    
    const foundTargets: string[] = [];
    opts.forEach((optKey, i) => {
      if (targets[i]) {
        foundTargets.push(targets[i]);
      } else {
        // Look for optKey in extracted keys
        const extIdx = extracted.keys.findIndex(k => k.toLowerCase() === optKey.toLowerCase());
        if (extIdx !== -1) {
          foundTargets.push(extracted.values[extIdx]);
        } else {
          // Fallback search inside the combined text
          const lines = combined.split(/\r?\n|\||,|;/);
          let found = false;
          for (const line of lines) {
            if (line.toLowerCase().includes(optKey.toLowerCase())) {
              const parts = line.split(/(?:->|=>|::|➡️|=)/);
              if (parts.length >= 2) {
                foundTargets.push(parts[parts.length - 1].trim());
                found = true;
                break;
              }
            }
          }
          if (!found) {
            foundTargets.push(`Définition ${i + 1}`);
          }
        }
      }
    });
    targets = foundTargets;
  }

  // 4. Ultimate fallback filling
  if (opts.length > 0) {
    while (targets.length < opts.length) {
      const idx = targets.length;
      targets.push(`Définition ${idx + 1}`);
    }
  }

  // 5. Ensure we return unique and paired lists
  return {
    options: opts,
    matchingTargets: targets
  };
}
