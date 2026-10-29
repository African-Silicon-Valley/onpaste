import { insertText } from './insert.js';
import type { PasteInfo } from './types.js';

function readFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  if (data.files && data.files.length > 0) return Array.from(data.files);
  if (!data.items) return [];
  const files: File[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

function readType(data: DataTransfer | null, type: string): string | null {
  if (!data) return null;
  try {
    const value = data.getData(type);
    return value === '' ? null : value;
  } catch {
    return null;
  }
}

/** Does `type` satisfy `pattern`, which may be exact or a `image/*` wildcard? */
function matchesType(type: string, pattern: string): boolean {
  if (pattern === '*' || pattern === '*/*' || type === pattern) return true;
  if (!pattern.endsWith('/*')) return false;
  return type.startsWith(pattern.slice(0, -1));
}

/**
 * Does the clipboard offer at least one of `patterns`?
 *
 * Both the data types (`text/plain`, `text/html`, …) and the MIME types of any
 * pasted files are considered. Browsers list a pasted file as the single data
 * type `'Files'` and keep its real MIME type on the `File` itself, so matching
 * `types` alone would never let `'image/*'` through.
 */
export function hasType(types: string[], files: File[], patterns: string[]): boolean {
  return patterns.some(
    (pattern) =>
      types.some((type) => matchesType(type, pattern)) ||
      files.some((file) => file.type !== '' && matchesType(file.type, pattern)),
  );
}

export function buildInfo(
  event: ClipboardEvent,
  target: Element,
  currentTarget: Element,
): PasteInfo {
  const data = event.clipboardData;
  const types = data?.types ? Array.from(data.types) : [];

  return {
    text: readType(data, 'text/plain') ?? '',
    html: readType(data, 'text/html'),
    files: readFiles(data),
    types,
    target,
    currentTarget,
    event,
    preventDefault() {
      event.preventDefault();
    },
    insert(value: string) {
      event.preventDefault();
      insertText(target, value);
    },
  };
}
