import { Platform, Share } from 'react-native';

/** Exporte un fichier texte : téléchargement sur web, feuille de partage sur mobile. */
export async function exportText(filename: string, content: string, mime = 'text/plain'): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: filename, message: content });
}

export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\n');
}

/** Impression (→ PDF via le navigateur) sur web ; sur mobile : Phase 2 (expo-print). */
export function printPage(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.print();
    return true;
  }
  return false;
}
