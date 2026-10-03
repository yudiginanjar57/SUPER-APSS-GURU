// Document Exporter Engine for EduAsisten AI
// Provides high-fidelity Microsoft Word (.doc), Print/PDF (A4/F4), and Rich-Text Clipboard generation

import { formatDriveImageUrl } from "./driveUtils";
import { 
  buildCoverPageHtml, 
  getGeometricHeaderSvg, 
  getGeometricFooterSvg 
} from "./documentTemplateAssets";

export interface DocMetadata {
  title: string;
  subject?: string;
  grade?: string;
  topic?: string;
  docType?: 'modul' | 'lkpd' | 'prota' | 'atp' | 'soal' | 'pembahasan' | 'rubrik' | 'penilaian' | 'umum';
  schoolName?: string;
  schoolAddress?: string;
  schoolContact?: string;
  teacherName?: string;
  teacherNip?: string;
  principalName?: string;
  principalNip?: string;
  academicYear?: string;
}

export interface ExportOptions {
  paperSize?: 'A4' | 'F4';
  fontFamily?: 'Calibri' | 'Times New Roman' | 'Arial';
  includeKop?: boolean;
  kopType?: 'text' | 'image';
  customKopImageUrl?: string;
  includeSignature?: boolean;
  exportMode?: 'full' | 'questions_only' | 'answers_only';
  customSchoolName?: string;
  customSchoolAddress?: string;
  customSchoolSubheader?: string;
  customTeacherName?: string;
  customTeacherNip?: string;
  customPrincipalName?: string;
  customPrincipalNip?: string;
  customCity?: string;

  // Tanda Tangan Elektronik (TTE) Options
  useTeacherTte?: boolean;
  teacherTteImageUrl?: string;
  usePrincipalTte?: boolean;
  principalTteImageUrl?: string;

  // Modern Cover Page & Geometric Frame Options (Gambar 1 & Gambar 2)
  includeCover?: boolean;
  includeGeometricFrame?: boolean;
  coverTitle?: string;
  coverSubtitle?: string;
  coverAuthor?: string;
  coverNip?: string;
  coverSchool?: string;
  coverAddress?: string;
  coverYear?: string;
  coverBrandText?: string;
}

const DEFAULT_OPTIONS: ExportOptions = {
  paperSize: 'A4',
  fontFamily: 'Calibri',
  includeKop: false, // Default TANPA KOP (Opsional)
  kopType: 'text',
  includeSignature: false, // Default TANPA TTD (Opsional)
  exportMode: 'full',
  includeCover: true, // Default PAKAI COVER (Gambar 1)
  includeGeometricFrame: true, // Default PAKAI FRAME HEADER & FOOTER (Gambar 2)
};

/**
 * Extracts metadata (Title, Mapel, Kelas, Bab, DocType) automatically from AI output content
 */
export function detectDocumentMetadata(
  content: string, 
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string; tahunPelajaran?: string; alamatSekolah?: string; kontakSekolah?: string; },
  hints?: { docType?: string; title?: string }
): DocMetadata {
  const meta: DocMetadata = {
    title: 'Dokumen Administrasi Pembelajaran',
    docType: 'umum',
    schoolName: userProfile?.namaSekolah || 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI',
    schoolAddress: userProfile?.alamatSekolah || '',
    schoolContact: userProfile?.kontakSekolah || '',
    teacherName: userProfile?.namaPenyusun || 'Guru Mata Pelajaran',
    teacherNip: userProfile?.nipPenyusun || '',
    principalName: userProfile?.namaKepsek || '',
    principalNip: userProfile?.nipKepsek || '',
    academicYear: userProfile?.tahunPelajaran || '2024/2025',
  };

  // Attempt to extract the primary title from the first H1 or H2 tag, or first bold paragraph
  let extractedHeaderTitle = '';
  const firstHeaderMatch = content.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
  if (firstHeaderMatch && firstHeaderMatch[1]) {
    const cleanText = firstHeaderMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanText && cleanText.length > 5) {
      extractedHeaderTitle = cleanText;
    }
  }
  if (!extractedHeaderTitle) {
    const pStrongMatch = content.match(/<p[^>]*>\s*<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*<\/p>/i);
    if (pStrongMatch && pStrongMatch[1]) {
      const cleanText = pStrongMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanText && cleanText.length > 5 && /[A-Z]{3,}/.test(cleanText)) {
        extractedHeaderTitle = cleanText;
      }
    }
  }

  // Convert HTML to plain text carefully to avoid merging words and to preserve structural newlines
  const plainTextContent = content
    .replace(/<(br|p|div|tr|h\d|ul|ol|li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');

  if (!plainTextContent) return meta;

  // 1. Detect or assign Doc Type
  if (hints?.docType) {
    const dt = hints.docType.toLowerCase();
    if (dt === 'lkpd') {
      meta.docType = 'lkpd';
      meta.title = 'Lembar Kerja Peserta Didik (LKPD)';
    } else if (dt === 'modul' || dt === 'rppm') {
      meta.docType = 'modul';
      meta.title = 'Modul Ajar';
    } else if (dt === 'prota' || dt === 'prosem') {
      meta.docType = 'prota';
      meta.title = 'Program Tahunan & Semester';
    } else if (dt === 'atp' || dt === 'cp') {
      meta.docType = 'atp';
      meta.title = 'Analisis CP & ATP';
    } else if (dt === 'soal') {
      meta.docType = 'soal';
      meta.title = 'Naskah Soal';
    } else if (dt === 'pembahasan') {
      meta.docType = 'pembahasan';
      meta.title = 'Pembahasan Soal';
    } else if (dt === 'rubrik') {
      meta.docType = 'rubrik';
      meta.title = 'Rubrik Penilaian';
    } else if (dt === 'penilaian' || dt === 'koreksi') {
      meta.docType = 'penilaian';
      meta.title = 'Laporan Hasil Penilaian Siswa';
    }
  }

  // If no explicit docType from hints, auto-detect with prioritized regex
  if (meta.docType === 'umum') {
    if (/LEMBAR KERJA PESERTA DIDIK|LKPD|LEMBAR KERJA SISWA|\bLKS\b/i.test(plainTextContent)) {
      meta.docType = 'lkpd';
      meta.title = 'Lembar Kerja Peserta Didik (LKPD)';
    } else if (/PROGRAM TAHUNAN|PROGRAM SEMESTER|\bPROTA\b|\bPROSEM\b|ANALISIS KKTP/i.test(plainTextContent)) {
      meta.docType = 'prota';
      meta.title = 'Program Tahunan & Semester (Prota, Prosem, KKTP)';
    } else if (/PEMBAHASAN SOAL|KUNCI JAWABAN|BEDAH SOAL/i.test(plainTextContent)) {
      meta.docType = 'pembahasan';
      meta.title = 'Pembahasan Soal & Kunci Jawaban';
    } else if (/MODUL AJAR|RPPM|DEEP LEARNING/i.test(plainTextContent)) {
      meta.docType = 'modul';
      meta.title = 'Modul Ajar Deep Learning';
    } else if (/SOAL NO\.|PAKET SOAL|KISI-KISI|PILGAN|PILIHAN GANDA|NASKAH SOAL/i.test(plainTextContent)) {
      meta.docType = 'soal';
      meta.title = 'Naskah Soal Evaluasi Pembelajaran';
    } else if (/CAPAIAN PEMBELAJARAN|ALUR TUJUAN|ATP|TP /i.test(plainTextContent)) {
      meta.docType = 'atp';
      meta.title = 'Analisis Capaian & Alur Tujuan Pembelajaran (ATP)';
    } else if (/RUBRIK PENILAIAN|KRITERIA EVALUASI|RUBRIK OBSERVASI/i.test(plainTextContent)) {
      meta.docType = 'rubrik';
      meta.title = 'Rubrik Penilaian Pembelajaran';
    } else if (/HASIL PENILAIAN AI|LEMBAR KOREKSI|LAPORAN PENILAIAN/i.test(plainTextContent)) {
      meta.docType = 'penilaian';
      meta.title = 'Laporan Hasil Penilaian Siswa';
    }
  }

  // Extract Subject (Mata Pelajaran)
  const mapelMatch = plainTextContent.match(/MATA\s+PELAJARAN\s*[:=]?\s*([^\n\r*#|]+)/i) || 
                     plainTextContent.match(/\*\*Mata Pelajaran\*\*\s*[:|]?\s*([^\n\r*#|]+)/i) ||
                     plainTextContent.match(/Mapel\s*[:=]?\s*([^\n\r*#|]+)/i);
  if (mapelMatch && mapelMatch[1]) {
    let subjectExtracted = mapelMatch[1].trim();
    // If the extracted subject is actually the teacher's name (e.g., contains S.Pd, or matches userProfile)
    if (userProfile?.namaPenyusun && subjectExtracted.toLowerCase().includes(userProfile.namaPenyusun.split(',')[0].toLowerCase())) {
       subjectExtracted = '';
    } else if (/(S\.Pd|M\.Pd|S\.T|M\.T|S\.Ag|S\.E|S\.Kom|M\.Kom)/i.test(subjectExtracted)) {
       subjectExtracted = ''; // It's a name, not a subject
    }
    meta.subject = subjectExtracted;
  }

  // Extract Topic / BAB
  const babMatch = plainTextContent.match(/BAB\s*[\d\w]*\s*[:\-]?\s*([^\n\r*#|]+)/i) ||
                   plainTextContent.match(/Topik\s*[:=]?\s*([^\n\r*#|]+)/i) ||
                   plainTextContent.match(/Materi\s*Pokok\s*[:=]?\s*([^\n\r*#|]+)/i) ||
                   plainTextContent.match(/Materi\s*Esensial\s*[:=]?\s*([^\n\r*#|]+)/i);
  if (babMatch && babMatch[1]) {
    meta.topic = babMatch[1].trim();
  }

  // Extract Grade (Kelas/Fase)
  const kelasMatch = plainTextContent.match(/Kelas\s*\/[^\n:=]*[:=]?\s*([^\n\r*#|]+)/i) ||
                     plainTextContent.match(/Fase\s*[:=]?\s*([^\n\r*#|]+)/i) ||
                     plainTextContent.match(/Fase\s*\/\s*Kelas\s*[:=]?\s*([^\n\r*#|]+)/i);
  if (kelasMatch && kelasMatch[1]) {
    meta.grade = kelasMatch[1].trim();
  }

  // Extract Academic Year (Tahun Pelajaran) - only fallback to text extraction if not set in userProfile
  if (!userProfile?.tahunPelajaran) {
    const tahunMatch = plainTextContent.match(/Tahun\s+Pelajaran\s*[:=]?\s*([0-9]{4}\s*\/\s*[0-9]{4})/i) ||
                       plainTextContent.match(/TAHUN\s+PELAJARAN\s*([0-9]{4}\s*\/\s*[0-9]{4})/i);
    if (tahunMatch && tahunMatch[1]) {
      meta.academicYear = tahunMatch[1].trim();
    }
  }

  // Refine Title based on detected docType and details
  if (extractedHeaderTitle) {
    meta.title = extractedHeaderTitle;
  } else if (meta.docType === 'lkpd') {
    meta.title = meta.subject 
      ? `Lembar Kerja Peserta Didik (LKPD) - ${meta.subject}${meta.topic ? ` (${meta.topic})` : ''}` 
      : 'Lembar Kerja Peserta Didik (LKPD)';
  } else if (meta.docType === 'modul') {
    meta.title = meta.subject 
      ? `Modul Ajar - ${meta.subject}${meta.topic ? ` (${meta.topic})` : ''}` 
      : 'Modul Ajar';
  } else if (meta.docType === 'prota') {
    meta.title = meta.subject 
      ? `Program Tahunan & Semester (Prota & Prosem) - ${meta.subject}` 
      : 'Program Tahunan & Semester';
  } else if (meta.docType === 'atp') {
    meta.title = meta.subject 
      ? `Analisis CP, TP, dan ATP - ${meta.subject}` 
      : 'Analisis CP & ATP';
  } else if (meta.docType === 'pembahasan') {
    meta.title = meta.subject 
      ? `Pembahasan Soal & Kunci Jawaban - ${meta.subject}${meta.grade ? ` ${meta.grade}` : ''}` 
      : 'Pembahasan Soal & Kunci Jawaban';
  } else if (meta.docType === 'soal') {
    meta.title = meta.subject 
      ? `Naskah Soal Evaluasi - ${meta.subject}${meta.grade ? ` ${meta.grade}` : ''}` 
      : 'Naskah Soal';
  } else if (meta.docType === 'rubrik') {
    meta.title = meta.subject 
      ? `Rubrik Penilaian - ${meta.subject}` 
      : 'Rubrik Penilaian';
  } else if (meta.docType === 'penilaian') {
    meta.title = meta.subject 
      ? `Laporan Hasil Penilaian Siswa - ${meta.subject}` 
      : 'Laporan Hasil Penilaian Siswa';
  }

  // Overwrite if user provided an explicit title
  if (hints?.title && hints.title.trim()) {
    meta.title = hints.title.trim();
  }

  return meta;
}

/**
 * Rasterizes a single SVG string into a high-resolution base64 PNG data URL
 */
export async function rasterizeSingleSvg(svgString: string, width = 800, height = 110): Promise<string> {
  return new Promise<string>((resolve) => {
    try {
      if (typeof window === 'undefined') {
        return resolve('');
      }
      let finalSvg = svgString.trim();
      if (!finalSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        finalSvg = finalSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const encoded = encodeURIComponent(finalSvg);
      const src = `data:image/svg+xml;charset=utf-8,${encoded}`;
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * 2;
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          console.warn('Canvas rasterization failed:', e);
        }
        resolve(src);
      };
      img.onerror = () => {
        resolve(src);
      };
      img.src = src;
    } catch {
      resolve('');
    }
  });
}

/**
 * Rasterizes SVGs to base64 PNG images for better compatibility with MS Word
 */
async function rasterizeSVGsToImages(html: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const svgs = Array.from(doc.querySelectorAll('svg')).filter(
    s => !s.classList.contains('lucide') && !s.closest('.katex')
  );

  if (svgs.length === 0) return html;

  for (const svg of svgs) {
    await new Promise<void>((resolve) => {
      try {
        let width = parseInt(svg.getAttribute('width') || '0');
        let height = parseInt(svg.getAttribute('height') || '0');
        
        if (!width || !height) {
          const viewBox = svg.getAttribute('viewBox');
          if (viewBox) {
            const parts = viewBox.split(' ');
            if (parts.length === 4) {
              width = parseInt(parts[2]);
              height = parseInt(parts[3]);
            }
          }
        }
        
        if (!width) width = 600;
        if (!height) height = 400;
        
        svg.setAttribute('width', width.toString());
        svg.setAttribute('height', height.toString());
        
        if (!svg.getAttribute('xmlns')) {
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }

        const svgData = new XMLSerializer().serializeToString(svg);
        const encoded = encodeURIComponent(svgData);
        const src = `data:image/svg+xml;charset=utf-8,${encoded}`;
        
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width * 2;
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0, width, height);
            const pngData = canvas.toDataURL('image/png');
            
            const newImg = doc.createElement('img');
            newImg.src = pngData;
            
            // Limit width for MS Word to prevent stretching
            let displayWidth = width;
            let displayHeight = height;
            const MAX_WORD_WIDTH = 600;
            if (displayWidth > MAX_WORD_WIDTH) {
              const ratio = MAX_WORD_WIDTH / displayWidth;
              displayWidth = MAX_WORD_WIDTH;
              displayHeight = height * ratio;
            }
            
            newImg.setAttribute('width', Math.round(displayWidth).toString());
            newImg.setAttribute('height', Math.round(displayHeight).toString());
            
            newImg.style.maxWidth = '100%';
            newImg.style.height = 'auto';
            newImg.style.display = 'block';
            newImg.style.margin = '8px auto';
            svg.replaceWith(newImg);
          }
          resolve();
        };
        img.onerror = (e) => {
          console.error('SVG rasterization failed', e);
          resolve();
        };
        img.src = src;
      } catch (err) {
        console.error('Error processing SVG', err);
        resolve();
      }
    });
  }
  
  return doc.body.innerHTML;
}

/**
 * Automatically splits any NIP found inside an identity table cell (e.g. "Nama Guru (NIP: ...)")
 * into a separate, clean table row with the label "NIP".
 */
export function splitNipInTables(doc: Document): void {
  const rows = doc.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 2) {
      const secondCellText = cells[1].textContent?.trim() || '';
      
      const nipRegex = /\s*[\/\(]?\s*NIP\s*[:\.]?\s*([0-9\s\-]{8,})\)?/i;
      const match = secondCellText.match(nipRegex);
      if (match) {
        const nipValue = match[1].trim();
        let nameValue = secondCellText.replace(nipRegex, '').trim();
        nameValue = nameValue.replace(/[\/\(\)\s\-:,]+$/, '').trim();
        
        // Update first cell row's value to just the name
        cells[1].innerHTML = nameValue;
        
        // Create new row
        const newRow = doc.createElement('tr');
        
        const labelCell = doc.createElement('td');
        // Copy original attributes/styles if any
        if (cells[0].hasAttribute('style')) {
          labelCell.setAttribute('style', cells[0].getAttribute('style') || '');
        }
        if (cells[0].hasAttribute('class')) {
          labelCell.setAttribute('class', cells[0].getAttribute('class') || '');
        }
        
        // Set label to NIP. We preserve bold formatting if present in the label
        if (cells[0].querySelector('strong')) {
          labelCell.innerHTML = '<strong>NIP</strong>';
        } else if (cells[0].querySelector('b')) {
          labelCell.innerHTML = '<b>NIP</b>';
        } else {
          labelCell.innerHTML = 'NIP';
        }
        
        const valueCell = doc.createElement('td');
        if (cells[1].hasAttribute('style')) {
          valueCell.setAttribute('style', cells[1].getAttribute('style') || '');
        }
        if (cells[1].hasAttribute('class')) {
          valueCell.setAttribute('class', cells[1].getAttribute('class') || '');
        }
        valueCell.innerHTML = nipValue;
        
        newRow.appendChild(labelCell);
        newRow.appendChild(valueCell);
        
        // Insert after the current row
        row.insertAdjacentElement('afterend', newRow);
      }
    }
  });
}

/**
 * Removes conversational AI preamble / intro sentences (e.g. "Berikut adalah PEMBAHASAN SOAL ...", "Tentu, berikut ...")
 * and any directly following horizontal rule/divider line (<hr>).
 */
export function cleanIntroPreamble(html: string): string {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Automatically split NIP into its own separate table row
  splitNipInTables(doc);

  const isIntroText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    // Common conversational intro patterns in Indonesian
    const startsWithIntro = /^(berikut(\s+ini)?(\s+(adalah|merupakan|disajikan|terlampir|kami\s+sajikan))?|tentu(,|!|\s)|baik(lah)?(,|!|\s)|halo\s+(bapak|ibu|guru)|di\s+bawah\s+ini\s+adalah|ini\s+adalah)/i.test(trimmed);
    const mentionsTopicOrEndsWithColon = trimmed.endsWith(":") || trimmed.endsWith(".") || /naskah|soal|pembahasan|modul|kunci|gambar|dokumen|tabel|berikut/i.test(trimmed);
    return startsWithIntro && (mentionsTopicOrEndsWithColon || trimmed.length < 350);
  };

  // Inspect children of body from the beginning
  let child = doc.body.firstChild;
  while (child) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim() || "";
      if (!text) {
        const next = child.nextSibling;
        child.remove();
        child = next;
        continue;
      }
      if (isIntroText(text)) {
        const next = child.nextSibling;
        child.remove();
        child = next;
        continue;
      }
      break;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const text = el.textContent?.trim() || "";
      const tagName = el.tagName.toUpperCase();

      if (tagName === 'P' || tagName === 'DIV' || tagName === 'BLOCKQUOTE' || tagName === 'H4' || tagName === 'H5') {
        if (isIntroText(text)) {
          const next = el.nextSibling;
          el.remove();
          child = next;
          continue;
        }
      } else if (tagName === 'HR') {
        // Leading horizontal rule (either after removed intro, or stray at start)
        const next = el.nextSibling;
        el.remove();
        child = next;
        continue;
      } else if (!text && el.children.length === 0 && tagName !== 'IMG') {
        // Empty element
        const next = el.nextSibling;
        el.remove();
        child = next;
        continue;
      }
      break;
    } else {
      break;
    }
  }

  let cleaned = doc.body.innerHTML;

  // Regex safety net for markdown-converted HTML
  cleaned = cleaned.replace(/^\s*<p[^>]*>\s*(?:<strong>|<b>)?\s*(?:Berikut\s+(?:adalah|ini|merupakan|disajikan|terlampir)|Tentu|Baik)[\s\S]*?<\/p>\s*(?:<hr[^>]*\/?>)?/i, '');

  return cleaned.trim();
}

/**
 * Strips existing signature blocks (tables or sections containing Kepala Sekolah / Guru / TTD Pengesahan)
 * when includeSignature is explicitly false.
 */
export function stripSignatureBlock(html: string): string {
  if (!html) return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Look for signature headers and remove them and following signature elements
    const allHeaders = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, strong');
    allHeaders.forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (
        text.includes('tanda tangan pengesahan') ||
        text.includes('lembar pengesahan') ||
        text.includes('mengetahui,')
      ) {
        let next = el.nextElementSibling;
        while (next && (next.tagName === 'TABLE' || next.tagName === 'P' || next.tagName === 'DIV')) {
          const nextText = (next.textContent || '').toLowerCase();
          if (nextText.includes('kepala sekolah') || nextText.includes('nip') || nextText.includes('guru')) {
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
          } else {
            break;
          }
        }
        el.remove();
      }
    });

    // Check all tables in the document
    const tables = Array.from(doc.querySelectorAll('table'));
    tables.forEach(table => {
      const tableText = (table.textContent || '').toLowerCase();
      if (
        (tableText.includes('kepala sekolah') && tableText.includes('guru')) ||
        (tableText.includes('mengetahui') && tableText.includes('kepala sekolah'))
      ) {
        table.remove();
      }
    });

    return doc.body.innerHTML;
  } catch {
    return html
      .replace(/<table[^>]*>[\s\S]*?(?:Kepala Sekolah[\s\S]*?(?:Guru|NIP)|Guru Mata Pelajaran[\s\S]*?(?:Kepala|NIP))[\s\S]*?<\/table>/gi, '')
      .replace(/(?:<h[1-6][^>]*>|<p[^>]*>|<strong>)?\s*(?:Tanda Tangan Pengesahan|LEMBAR PENGESAHAN)[\s\S]*$/gi, '');
  }
}

/**
 * Automatically calculates professional percentage column widths for any given table element.
 * Columns with short contents like "NO" or "Nomor" are set narrow, whereas columns with descriptive/essay headers
 * or long answers are assigned wider dimensions.
 */
/**
 * Automatically calculates professional percentage column widths for any given table element.
 * Columns with short contents like "NO", "REF", "TANGGAL", "NO. BUKTI" are set with precise, non-wrapping dimensions,
 * whereas columns with descriptive/essay headers or long answers are assigned wider dimensions.
 * For 10-column / 12-column worksheets (Neraca Lajur), sets balanced sub-column widths.
 */
export function calculateTableColWidths(table: HTMLTableElement): string[] {
  // Find the cells of the first row (headers or tds)
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return [];
  
  // Look for header row with highest cell count (to handle multi-tier headers in 10-column tables)
  let bestRow = rows[0];
  let maxCellCount = rows[0].querySelectorAll('th, td').length;
  for (const r of rows) {
    const count = r.querySelectorAll('th, td').length;
    if (count > maxCellCount) {
      maxCellCount = count;
      bestRow = r;
    }
  }

  const cells = Array.from(bestRow.querySelectorAll('th, td'));
  const numCols = cells.length;
  if (numCols === 0) return [];

  const tableText = (table.textContent || '').toLowerCase();
  const isNeracaLajur = numCols >= 8 || tableText.includes('neraca lajur') || tableText.includes('kertas kerja') || tableText.includes('neraca saldo (d)');

  // Special handling for 10-column to 12-column Neraca Lajur / Kertas Kerja
  if (isNeracaLajur && numCols >= 10) {
    const finalWidths: string[] = [];
    if (numCols === 12) {
      finalWidths.push('4.5%'); // No / Kode Akun
      finalWidths.push('19.5%'); // Nama Akun
      for (let i = 2; i < 12; i++) {
        finalWidths.push('7.6%'); // 10 D/K columns
      }
    } else if (numCols === 11) {
      finalWidths.push('5%'); // No
      finalWidths.push('21%'); // Nama Akun
      for (let i = 2; i < 11; i++) {
        finalWidths.push('8.2%');
      }
    } else {
      // 10 columns
      finalWidths.push('5%');
      finalWidths.push('23%');
      for (let i = 2; i < 10; i++) {
        finalWidths.push('9%');
      }
    }
    return finalWidths;
  }

  // Handling for 6-column Jurnal Umum (Tanggal, No Bukti, Nama Akun & Keterangan, Ref, Debit, Kredit)
  if (numCols === 6 && (tableText.includes('debit') && tableText.includes('kredit') && (tableText.includes('bukti') || tableText.includes('keterangan')))) {
    return ['12%', '11%', '37%', '6%', '17%', '17%'];
  }

  // Handling for 7-column Buku Besar (Tanggal, Keterangan, Ref, Debit, Kredit, Saldo Debit, Saldo Kredit)
  if (numCols === 7 && (tableText.includes('saldo debit') || tableText.includes('saldo kredit'))) {
    return ['11%', '27%', '6%', '14%', '14%', '14%', '14%'];
  }

  // Handling for 5-column Neraca Saldo (No Akun, Nama Akun, Ref, Debit, Kredit)
  if (numCols === 5 && (tableText.includes('nama akun') && tableText.includes('debit') && tableText.includes('kredit'))) {
    return ['10%', '48%', '6%', '18%', '18%'];
  }

  // Handling for 5-column Analisis Bukti Transaksi (Tanggal, No Bukti, Akun Didebit, Akun Dikredit, Jumlah Nominal)
  if (numCols === 5 && (tableText.includes('didebit') || tableText.includes('dikredit') || tableText.includes('bukti'))) {
    return ['12%', '12%', '28%', '28%', '20%'];
  }

  // Generic weight-based calculation
  const weights = new Array(numCols).fill(10.0);
  const hardWidths = new Array(numCols).fill(null);

  // Analyze header text
  cells.forEach((cell, idx) => {
    const text = (cell.textContent || '').trim().toLowerCase();
    
    if (text === 'no' || text === 'no.' || text === 'nomor' || text === '#' || text === 'kd') {
      hardWidths[idx] = '6%';
      weights[idx] = 1.5;
    } else if (text === 'ref' || text === 'ref.' || text === 'refe') {
      hardWidths[idx] = '6%';
      weights[idx] = 1.5;
    } else if (text === 'skor' || text === 'nilai' || text === 'bobot' || text === 'skala' || text === 'pts' || text === 'grade' || text === 'kkm') {
      hardWidths[idx] = '8%';
      weights[idx] = 2.5;
    } else if (text === 'kelas' || text === 'fase' || text === 'semester' || text === 'tapel') {
      hardWidths[idx] = '10%';
      weights[idx] = 3.5;
    } else if (text === 'hari' || text === 'tanggal' || text === 'tgl' || text === 'waktu') {
      hardWidths[idx] = '12%';
      weights[idx] = 4.0;
    } else if (text.includes('no. bukti') || text.includes('no bukti') || text.includes('nomor bukti')) {
      hardWidths[idx] = '11%';
      weights[idx] = 3.8;
    } else if (text === 'debit' || text === 'kredit' || text === 'debit (rp)' || text === 'kredit (rp)') {
      hardWidths[idx] = '16%';
      weights[idx] = 5.5;
    } else if (
      text.includes('alasan') || 
      text.includes('penjelasan') || 
      text.includes('pembahasan') || 
      text.includes('analisis') || 
      text.includes('deskripsi') || 
      text.includes('uraian') || 
      text.includes('studi kasus') || 
      text.includes('keterangan') || 
      text.includes('nama akun & keterangan') ||
      text.includes('jawaban') ||
      text.includes('transaksi') ||
      text.includes('praktik') ||
      text.includes('tantangan')
    ) {
      weights[idx] = 18.0; // Essay / long columns
    } else if (
      text.includes('perlu bimbingan') || 
      text.includes('cukup') || 
      text.includes('baik') || 
      text.includes('sangat baik') ||
      text.includes('baru berkembang') ||
      text.includes('layak') ||
      text.includes('cakap') ||
      text.includes('mahir')
    ) {
      hardWidths[idx] = '19%';
      weights[idx] = 6.0;
    }
  });

  // Look at body cells to refine weights
  const dataRows = rows.slice(1, 6);
  if (dataRows.length > 0) {
    const colTextLengths: number[][] = Array.from({ length: numCols }, () => []);
    dataRows.forEach(row => {
      const rowCells = row.querySelectorAll('td');
      rowCells.forEach((cell, idx) => {
        if (idx < numCols) {
          colTextLengths[idx].push((cell.textContent || '').trim().length);
        }
      });
    });

    colTextLengths.forEach((lengths, idx) => {
      if (lengths.length === 0) return;
      const avgLength = lengths.reduce((sum, val) => sum + val, 0) / lengths.length;
      const maxLength = Math.max(...lengths);

      if (!hardWidths[idx]) {
        if (avgLength < 4) {
          weights[idx] = 3.0;
        } else if (avgLength < 15) {
          weights[idx] = 6.0;
        } else if (avgLength > 150) {
          weights[idx] = 22.0;
        } else if (avgLength > 80) {
          weights[idx] = 16.0;
        }
      } else {
        if (hardWidths[idx] === '6%' && maxLength > 15) {
          hardWidths[idx] = null;
          weights[idx] = 10.0;
        }
      }
    });
  }

  // Calculate percentages
  let hardcodedPercentageSum = 0;
  let nonHardcodedWeightSum = 0;
  
  hardWidths.forEach((hw, idx) => {
    if (hw) {
      hardcodedPercentageSum += parseFloat(hw);
    } else {
      nonHardcodedWeightSum += weights[idx];
    }
  });

  if (nonHardcodedWeightSum <= 0) {
    nonHardcodedWeightSum = 1;
  }

  const remainingPercentage = Math.max(10, 100 - hardcodedPercentageSum);
  const finalWidths: string[] = [];

  hardWidths.forEach((hw, idx) => {
    if (hw) {
      finalWidths.push(hw);
    } else {
      const pct = (weights[idx] / nonHardcodedWeightSum) * remainingPercentage;
      finalWidths.push(`${Math.round(pct * 10) / 10}%`);
    }
  });

  return finalWidths;
}

/**
 * Automatically detects wide tables (e.g. Neraca Lajur 10 Kolom, Kertas Kerja, Jurnal Khusus)
 * and wraps them in a dedicated landscape section for 1-page landscape printing & export.
 */
export function wrapLandscapeSections(html: string): string {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll('table').forEach(table => {
    // Check if table is already wrapped in landscape container
    if (table.closest('.page-landscape') || table.closest('.landscape-section') || table.closest('.LandscapeSection')) {
      return;
    }

    const tableText = (table.textContent || '').toLowerCase();
    const rows = Array.from(table.querySelectorAll('tr'));
    const maxCols = rows.reduce((max, r) => Math.max(max, r.querySelectorAll('th, td').length), 0);

    const isWideWorksheet = 
      maxCols >= 8 || 
      tableText.includes('neraca lajur') || 
      tableText.includes('kertas kerja') ||
      tableText.includes('jurnal khusus') ||
      tableText.includes('neraca saldo (d)') ||
      tableText.includes('laba rugi (d)') ||
      tableText.includes('nsd (d)');

    if (isWideWorksheet) {
      const wrapper = doc.createElement('div');
      wrapper.className = 'page-landscape landscape-section';
      wrapper.setAttribute('style', 'page-break-before: always; break-before: page; page-break-after: always; break-after: page; width: 100%;');

      // Check if previous sibling is a heading or introductory paragraph for this table
      let prev = table.previousElementSibling;
      const elementsToMove: Element[] = [table];

      if (prev && (prev.tagName.match(/^H[1-6]$/i) || prev.tagName === 'P' || prev.tagName === 'DIV')) {
        const prevText = (prev.textContent || '').toLowerCase();
        if (prevText.includes('neraca lajur') || prevText.includes('kertas kerja') || prevText.includes('tabel kerja 6') || prevText.includes('10 kolom') || prevText.includes('jurnal khusus')) {
          elementsToMove.unshift(prev);
          // Check if there is also an H3/H2 before the paragraph
          const prevPrev = prev.previousElementSibling;
          if (prevPrev && prevPrev.tagName.match(/^H[1-6]$/i)) {
            const ppText = (prevPrev.textContent || '').toLowerCase();
            if (ppText.includes('neraca lajur') || ppText.includes('kertas kerja') || ppText.includes('tabel kerja 6') || ppText.includes('10 kolom')) {
              elementsToMove.unshift(prevPrev);
            }
          }
        }
      }

      // Insert wrapper before the first element to move
      const firstEl = elementsToMove[0];
      firstEl.parentElement?.insertBefore(wrapper, firstEl);

      // Append all elements into wrapper
      elementsToMove.forEach(el => wrapper.appendChild(el));
    }
  });

  return doc.body.innerHTML;
}

/**
 * Runs across the HTML source and optimizes table column widths and cell alignments
 */
export function optimizeHtmlTableWidths(html: string): string {
  if (!html) return "";
  const withLandscape = wrapLandscapeSections(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(withLandscape, "text/html");

  doc.querySelectorAll('table').forEach(table => {
    const rawStyle = (table.getAttribute('style') || '').toLowerCase();
    const tableText = (table.textContent || '').toLowerCase();
    const isSignature = rawStyle.includes('border: none') || 
                        rawStyle.includes('border:none') || 
                        table.classList.contains('signature-table') || 
                        table.classList.contains('no-border') ||
                        ((tableText.includes('kepala sekolah') || tableText.includes('mengetahui')) && tableText.includes('guru'));
    
    if (isSignature) return;

    const colWidths = calculateTableColWidths(table);
    if (colWidths.length === 0) return;

    const isLandscapeTable = Boolean(table.closest('.page-landscape') || table.closest('.landscape-section') || colWidths.length >= 8);

    const rows = table.querySelectorAll('tr');
    rows.forEach((row, rowIndex) => {
      row.querySelectorAll('th').forEach((th, colIndex) => {
        const thText = (th.textContent || '').trim().toLowerCase();
        const isShortHeader = thText === 'no' || thText === 'no.' || thText === '#' || thText === 'ref' || thText === 'ref.' || thText === 'd' || thText === 'k' || thText === 'd / k' || thText === 'd/k';
        const isNumericHeader = thText.includes('debit') || thText.includes('kredit') || thText.includes('jumlah') || thText.includes('nominal') || thText.includes('rp') || thText.includes('saldo');
        
        let alignStyle = "text-align: left;";
        if (isShortHeader || isNumericHeader || isLandscapeTable) {
          alignStyle = "text-align: center; white-space: nowrap;";
        }

        const widthStr = colWidths[colIndex] ? `width: ${colWidths[colIndex]} !important;` : "";
        const paddingStr = isLandscapeTable ? "padding: 3.5pt 4pt !important; font-size: 8.5pt !important;" : "padding: 4.5pt 6pt !important;";
        
        const baseStyle = `border: 1pt solid #000000 !important; background-color: #1e3a8a !important; color: #ffffff !important; font-weight: bold !important; vertical-align: middle !important; text-transform: uppercase !important; word-break: normal !important; overflow-wrap: break-word !important; hyphens: none !important; ${paddingStr} ${alignStyle} ${widthStr}`;

        th.setAttribute('style', baseStyle);
      });

      row.querySelectorAll('td').forEach((td, colIndex) => {
        const rawContent = (td.textContent || '').trim();
        // Clean any accidental placeholder guides like ".. / .." or "..........."
        if (rawContent === '.. / ..' || rawContent === '../..' || rawContent === '..') {
          td.innerHTML = '&nbsp;';
        } else if (/^\.{3,}$/.test(rawContent)) {
          td.innerHTML = '&nbsp;';
        }

        const currentText = (td.textContent || '').trim();
        const isEmpty = currentText === '' || currentText === ' ' || currentText === '-';
        const isShortToken = currentText.length <= 6 && (currentText.startsWith('10') || currentText.startsWith('20') || currentText.startsWith('30') || currentText.startsWith('40') || currentText.startsWith('50') || currentText.startsWith('60') || currentText.includes('Des') || currentText === '✓' || currentText === '-' || currentText.startsWith('BKK') || currentText.startsWith('BKM') || currentText.startsWith('F-') || currentText.startsWith('NK-') || currentText.startsWith('ND-') || currentText.startsWith('JU-') || currentText.startsWith('AJP'));
        const isNumeric = currentText.startsWith('Rp') || /^[0-9.,\-]+$/.test(currentText);

        let cellAlign = "text-align: left;";
        if (isEmpty) {
          cellAlign = "text-align: center; height: 22pt !important; min-height: 22pt !important;";
        } else if (isShortToken || colIndex === 0 || colIndex === 3) {
          cellAlign = "text-align: center; white-space: nowrap;";
        } else if (isNumeric) {
          cellAlign = "text-align: right; white-space: nowrap;";
        }

        const widthStr = colWidths[colIndex] ? `width: ${colWidths[colIndex]} !important;` : "";
        const paddingStr = isLandscapeTable ? "padding: 3.5pt 4pt !important; font-size: 8.5pt !important;" : "padding: 4.5pt 6pt !important;";
        const isEven = rowIndex % 2 === 0;
        const bgStr = isEven ? "background-color: #f8fafc !important;" : "background-color: #ffffff !important;";

        const baseStyle = `border: 1pt solid #000000 !important; vertical-align: middle !important; color: #000000 !important; word-break: normal !important; overflow-wrap: break-word !important; ${bgStr} ${paddingStr} ${cellAlign} ${widthStr}`;

        td.setAttribute('style', baseStyle);
      });
    });
  });

  return doc.body.innerHTML;
}

/**
 * Cleans KaTeX and nested DOM elements for clean Word & Print formatting
 */
function sanitizeKatexAndHtml(html: string, target: 'word' | 'print' | 'clipboard' = 'word'): string {
  if (!html) return "";

  const preCleaned = cleanIntroPreamble(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(preCleaned, "text/html");

  // 1. Process Math/KaTeX
  if (target === 'word' || target === 'clipboard') {
    // For Word and Clipboard, extract native MathML so Word can parse it as OMML
    const katexElements = doc.querySelectorAll('.katex, .katex-display');
    katexElements.forEach((el) => {
      const mathml = el.querySelector('.katex-mathml math');
      if (mathml) {
        // Ensure proper namespace for Word
        if (!mathml.hasAttribute('xmlns')) {
          mathml.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
        }
        el.replaceWith(mathml);
      } else {
        const fallback = doc.createElement('i');
        fallback.textContent = el.textContent || "";
        el.replaceWith(fallback);
      }
    });
  } else if (target === 'print') {
    // For Print/PDF target, clean up KaTeX mathml to avoid duplicate overlapping text
    const mathmlElements = doc.querySelectorAll('.katex .katex-mathml');
    mathmlElements.forEach((el) => el.remove());
  }

  // 2. Remove non-printable UI elements (like copy buttons or small lucide UI icons), but PRESERVE charts/infographics (SVG) and images
  doc.querySelectorAll('button, svg.lucide').forEach(el => el.remove());

  // Ensure media (images, preserved SVGs) scale properly in Word
  doc.querySelectorAll('img, svg').forEach(media => {
    const htmlMedia = media as HTMLElement;
    if (target !== 'word') {
      htmlMedia.style.maxWidth = "100%";
      htmlMedia.style.height = "auto";
    }
    const currentStyle = media.getAttribute('style') || "";
    if (media.tagName.toLowerCase() === 'img' && !currentStyle.includes('display:')) {
      htmlMedia.style.display = "block";
      htmlMedia.style.margin = "8px auto";
    }
  });

  // 3. Transform and style tables for MS Word & Print
  doc.querySelectorAll('table').forEach(table => {
    const rawStyle = (table.getAttribute('style') || '').toLowerCase();
    const tableText = (table.textContent || '').toLowerCase();
    const isSignature = rawStyle.includes('border: none') || 
                        rawStyle.includes('border:none') || 
                        table.classList.contains('signature-table') || 
                        table.classList.contains('no-border') ||
                        ((tableText.includes('kepala sekolah') || tableText.includes('mengetahui')) && tableText.includes('guru'));

    if (isSignature) {
      table.setAttribute("border", "0");
      table.setAttribute("cellpadding", "4");
      table.setAttribute("cellspacing", "0");
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.margin = "24pt 0 14pt 0";
      table.style.border = "none";
      table.style.backgroundColor = "transparent";
      table.setAttribute('style', "width: 100%; text-align: center; border: none !important; mso-border-alt: none !important; background: transparent !important; margin-top: 24pt; margin-bottom: 14pt;");
      table.querySelectorAll('tr').forEach(tr => {
        tr.style.pageBreakInside = "avoid";
      });
      table.querySelectorAll('td').forEach(td => {
        td.style.border = "none";
        td.style.backgroundColor = "transparent";
        td.style.padding = "4pt 8pt";
        td.setAttribute('style', "text-align: center; border: none !important; mso-border-alt: none !important; background: transparent !important; padding: 4pt 8pt; vertical-align: top;");
      });
      return;
    }

    // Regular styled table with formal ALL BORDERS (Kurikulum Merdeka)
    table.setAttribute("border", "1");
    table.setAttribute("cellpadding", "5");
    table.setAttribute("cellspacing", "0");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.margin = "8pt 0 12pt 0";
    table.style.border = "1pt solid #000000";
    table.style.backgroundColor = "#ffffff";
    
    // Explicit MSO & CSS All-Border styles on table tag
    table.setAttribute(
      'style', 
      "width: 100%; border-collapse: collapse !important; border: 1pt solid #000000 !important; mso-border-alt: solid windowtext 0.75pt !important; mso-border-insideh: 0.75pt solid windowtext !important; mso-border-insidev: 0.75pt solid windowtext !important; margin: 8pt 0 12pt 0; background-color: #ffffff;"
    );

    // Repeat header on every page in Word & Print
    const thead = table.querySelector('thead');
    if (thead) {
      thead.style.display = "table-header-group";
    }

    const colWidths = calculateTableColWidths(table);
    const isLandscapeTable = Boolean(table.closest('.page-landscape') || table.closest('.landscape-section') || colWidths.length >= 8);

    // Process rows and cells with strict All-Border on every cell
    const rows = table.querySelectorAll('tr');
    rows.forEach((row, rowIndex) => {
      row.style.pageBreakInside = "avoid";
      const isHeaderRow = row.parentElement?.tagName.toLowerCase() === 'thead' || (rowIndex === 0 && Boolean(row.querySelector('th')));
      const isEven = rowIndex % 2 === 0;

      row.querySelectorAll('th').forEach((th, colIndex) => {
        let thWidth = "";
        if (colWidths[colIndex]) {
          thWidth = `width: ${colWidths[colIndex]};`;
        }

        const thText = (th.textContent || '').trim().toLowerCase();
        const isShortHeader = thText === 'no' || thText === 'no.' || thText === '#' || thText === 'ref' || thText === 'ref.' || thText === 'd' || thText === 'k' || thText === 'd / k' || thText === 'd/k';
        const isNumericHeader = thText.includes('debit') || thText.includes('kredit') || thText.includes('jumlah') || thText.includes('nominal') || thText.includes('rp') || thText.includes('saldo');
        
        let alignStyle = "text-align: left;";
        if (isShortHeader || isNumericHeader || isLandscapeTable) {
          alignStyle = "text-align: center; white-space: nowrap;";
        }

        const paddingStr = isLandscapeTable ? "padding: 3.5pt 4pt !important; font-size: 8.5pt !important;" : "padding: 4.5pt 6pt !important; font-size: 9.5pt !important;";

        th.setAttribute(
          'style',
          `border: 1pt solid #000000 !important; mso-border-alt: solid windowtext 0.75pt !important; background-color: #1e3a8a !important; color: #ffffff !important; font-weight: bold !important; ${paddingStr} ${alignStyle} vertical-align: middle !important; text-transform: uppercase !important; word-break: normal !important; overflow-wrap: break-word !important; hyphens: none !important; ${thWidth}`
        );
      });

      const tds = row.querySelectorAll('td');
      const isTwoCol = tds.length === 2;

      tds.forEach((td, colIndex) => {
        let tdBg = "#ffffff";
        let isBold = false;
        let colWidth = "";

        if (isTwoCol && colIndex === 0 && (td.querySelector('b') || td.querySelector('strong') || td.textContent?.includes('Satuan') || td.textContent?.includes('Mata') || td.textContent?.includes('Kelas') || td.textContent?.includes('Fase') || td.textContent?.includes('Alokasi') || td.textContent?.includes('Kelompok') || td.textContent?.includes('Parameter'))) {
          tdBg = "#f8fafc";
          isBold = true;
          colWidth = "width: 28%;";
        } else if (!isHeaderRow && isEven) {
          tdBg = "#f8fafc";
        }
        
        if (!colWidth && colWidths[colIndex]) {
          colWidth = `width: ${colWidths[colIndex]};`;
        }

        const rawContent = (td.textContent || '').trim();
        // Clean any placeholder guides like ".. / .." or repeated dots
        if (rawContent === '.. / ..' || rawContent === '../..' || rawContent === '..') {
          td.innerHTML = '&nbsp;';
        } else if (/^\.{3,}$/.test(rawContent)) {
          td.innerHTML = '&nbsp;';
        }

        const currentText = (td.textContent || '').trim();
        const isEmpty = currentText === '' || currentText === ' ' || currentText === '-';
        const isShortToken = currentText.length <= 6 && (currentText.startsWith('10') || currentText.startsWith('20') || currentText.startsWith('30') || currentText.startsWith('40') || currentText.startsWith('50') || currentText.startsWith('60') || currentText.includes('Des') || currentText === '✓' || currentText === '-' || currentText.startsWith('BKK') || currentText.startsWith('BKM') || currentText.startsWith('F-') || currentText.startsWith('NK-') || currentText.startsWith('ND-') || currentText.startsWith('JU-') || currentText.startsWith('AJP'));
        const isNumeric = currentText.startsWith('Rp') || /^[0-9.,\-]+$/.test(currentText);

        let cellAlign = "text-align: left;";
        if (isEmpty) {
          cellAlign = "text-align: center; height: 22pt !important; min-height: 22pt !important;";
        } else if (isShortToken || colIndex === 0 || colIndex === 3) {
          cellAlign = "text-align: center; white-space: nowrap;";
        } else if (isNumeric) {
          cellAlign = "text-align: right; white-space: nowrap;";
        }

        const paddingStr = isLandscapeTable ? "padding: 3.5pt 4pt !important; font-size: 8.5pt !important;" : "padding: 4.5pt 6pt !important; font-size: 9.5pt !important;";

        td.setAttribute(
          'style',
          `border: 1pt solid #000000 !important; mso-border-alt: solid windowtext 0.75pt !important; ${paddingStr} ${cellAlign} vertical-align: middle !important; line-height: 1.4 !important; color: #000000 !important; background-color: ${tdBg}; word-break: normal !important; overflow-wrap: break-word !important; ${isBold ? 'font-weight: bold;' : ''} ${colWidth}`
        );
      });
    });
  });

  // 4. Transform blockquotes
  doc.querySelectorAll('blockquote').forEach(bq => {
    bq.style.borderLeft = "3.5pt solid #2563eb";
    bq.style.backgroundColor = "#f8fafc";
    bq.style.padding = "6pt 10pt";
    bq.style.margin = "8pt 0";
    bq.style.borderTop = "0.5pt solid #e2e8f0";
    bq.style.borderRight = "0.5pt solid #e2e8f0";
    bq.style.borderBottom = "0.5pt solid #e2e8f0";
    bq.style.borderRadius = "4pt";
  });

  let clean = doc.body.innerHTML;

  // 5. Fix bullet points
  clean = clean.replace(/●/g, '&bull; ').replace(/•/g, '&bull; ');

  return clean;
}

/**
 * Extracts ONLY the questions/soal from document
 */
export function extractQuestionsOnlyText(html: string): string {
  if (!html) return "";

  let content = cleanIntroPreamble(html);

  // 1. Cut off everything from the first occurrence of answer section keywords
  const lowerHtml = content.toLowerCase();
  const keywords = [
    "kunci jawaban",
    "pembahasan soal",
    "kunci dan pembahasan",
    "rubrik penskoran",
    "pedoman penskoran",
    "kunci & pembahasan",
    "kunci &amp; pembahasan",
    "kunci jawaban &amp;",
    "pembahasan detail",
    "rubrik penilaian"
  ];

  let cutoffIndex = -1;
  for (const keyword of keywords) {
    const idx = lowerHtml.indexOf(keyword);
    if (idx !== -1) {
      // Find the tag start before this keyword (e.g., <h2, <h3, <p, <div, etc.)
      const tagStartIdx = content.lastIndexOf("<", idx);
      if (tagStartIdx !== -1) {
        if (cutoffIndex === -1 || tagStartIdx < cutoffIndex) {
          cutoffIndex = tagStartIdx;
        }
      }
    }
  }

  if (cutoffIndex !== -1) {
    content = content.substring(0, cutoffIndex);
  }

  // Strip inline answer keys / explanations
  content = content.replace(/<(p|div|li)[^>]*>\s*(?:<strong>|<b>)?\s*(?:Kunci\s+Jawaban|Kunci|Pembahasan|Kunci\s*&|Rubrik|Jawaban\s+Benar)\s*[:\-][\s\S]*?<\/\1>/gi, "");
  content = content.replace(/(?:<p[^>]*>|<br\s*\/?>)?\s*(?:<strong>|<b>)?\s*(?:Kunci\s+Jawaban|Kunci|Pembahasan)\s*[:\-]\s*[\s\S]*?(?:<\/strong>|<\/b>)?(?=(?:<p|<br|<div|<li|<\/li|<\/p|<\/div|$))/gi, "");

  // Remove preliminary module identity if mixed
  const soalHeaderMatch = content.match(/<(h[1-6]|p|div|strong|b)[^>]*>[\s\S]*?(?:NASKAH\s+SOAL|PAKET\s+SOAL|SOAL\s+PILIHAN\s+GANDA|SOAL\s+ASESMEN|SOAL\s+DIAGNOSTIK|SOAL\s+EVALUASI|SOAL\s+FORMATIF|SOAL\s+SUMATIF)[\s\S]*?<\/\1>/i);
  if (soalHeaderMatch && soalHeaderMatch.index !== undefined) {
    content = content.substring(soalHeaderMatch.index);
  }

  return content.trim();
}

/**
 * Extracts ONLY answers / pembahasan
 */
export function extractAnswersOnlyText(html: string): string {
  if (!html) return "";

  const clean = cleanIntroPreamble(html);
  const answerSectionMatch = clean.match(/<(h[1-6]|p|div|strong|b)[^>]*>[\s\S]*?(?:KUNCI\s+JAWABAN|PEMBAHASAN\s+SOAL|KUNCI\s+DAN\s+PEMBAHASAN|KUNCI\s+JAWABAN\s*&|PEDOMAN\s+PENSKORAN)[\s\S]*?<\/\1>[\s\S]*/i);
  if (answerSectionMatch && answerSectionMatch.index !== undefined) {
    return clean.substring(answerSectionMatch.index).trim();
  }

  return clean;
}

/**
 * Builds the official Letterhead (Kop Surat) HTML
 */
function buildKopSuratHtml(options: ExportOptions, meta: DocMetadata): string {
  if (!options.includeKop) return '';

  // Handle Kop Surat Gambar Digital
  if (options.kopType === 'image' && options.customKopImageUrl?.trim()) {
    const formattedImgUrl = formatDriveImageUrl(options.customKopImageUrl.trim());
    return `
    <div style="width: 100%; text-align: center; margin-bottom: 12pt; padding-bottom: 4pt; border-bottom: 2.5pt double #0f172a !important;">
      <img src="${formattedImgUrl}" alt="Kop Surat Digital" style="max-width: 100%; max-height: 150px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" />
    </div>
    `;
  }

  // Handle Kop Surat Teks Standar
  const school = options.customSchoolName || meta.schoolName || 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI';
  const subheader = options.customSchoolSubheader || 'DINAS PENDIDIKAN PROVINSI / KABUPATEN / KOTA';
  const address = options.customSchoolAddress || (meta.schoolAddress ? `${meta.schoolAddress}${meta.schoolContact ? ' • ' + meta.schoolContact : ''}` : 'Jl. Pendidikan Nasional No. 1 • Telp: (021) 123456 • info@sekolah.sch.id');

  return `
  <table style="width: 100%; border: none !important; border-collapse: collapse; margin-bottom: 12pt; border-bottom: 2.5pt double #0f172a !important; padding-bottom: 6pt;" border="0">
    <tr style="border: none !important;">
      <td style="width: 75px; text-align: center; vertical-align: middle; border: none !important; padding: 0 8pt 4pt 0;">
        <div style="width: 60px; height: 60px; background-color: #2563eb; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20pt; line-height: 60px; text-align: center; margin: 0 auto;">
          ★
        </div>
      </td>
      <td style="text-align: center; vertical-align: middle; border: none !important; padding: 0 0 4pt 0;">
        <div style="font-size: 11pt; font-weight: bold; color: #334155; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 1pt;">
          ${subheader}
        </div>
        <div style="font-size: 14pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1pt; margin-bottom: 2pt;">
          ${school}
        </div>
        <div style="font-size: 9pt; color: #64748b; font-style: italic;">
          ${address}
        </div>
      </td>
      <td style="width: 75px; text-align: center; vertical-align: middle; border: none !important; padding: 0 0 4pt 8pt;">
        <div style="width: 60px; height: 60px; border: 1.5pt solid #2563eb; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #2563eb; font-weight: bold; font-size: 10pt; line-height: 60px; text-align: center; margin: 0 auto;">
          KURIKULUM MERDEKA
        </div>
      </td>
    </tr>
  </table>
  `;
}

/**
 * Builds the official Signatures (Tanda Tangan Pengesahan) HTML
 */
function buildSignatureBlockHtml(options: ExportOptions, meta: DocMetadata): string {
  if (!options.includeSignature) return '';

  const teacherName = options.customTeacherName || meta.teacherName || 'Guru Mata Pelajaran';
  const teacherNip = options.customTeacherNip || meta.teacherNip || '....................................';
  const principalName = options.customPrincipalName || meta.principalName || 'Kepala Sekolah';
  const principalNip = options.customPrincipalNip || meta.principalNip || '....................................';
  const city = options.customCity || '...................';
  
  const now = new Date();
  const dateString = `${now.getDate()} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()]} ${now.getFullYear()}`;

  const principalTteHtml = options.usePrincipalTte && options.principalTteImageUrl?.trim()
    ? `<div style="height: 65pt; display: flex; align-items: center; justify-content: center; text-align: center; margin: 2pt 0;">
        <img src="${formatDriveImageUrl(options.principalTteImageUrl.trim())}" alt="TTE Kepala Sekolah" style="max-height: 58pt; max-width: 140pt; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" />
       </div>`
    : `<div style="height: 65pt;"></div>`;

  const teacherTteHtml = options.useTeacherTte && options.teacherTteImageUrl?.trim()
    ? `<div style="height: 65pt; display: flex; align-items: center; justify-content: center; text-align: center; margin: 2pt 0;">
        <img src="${formatDriveImageUrl(options.teacherTteImageUrl.trim())}" alt="TTE Guru Mata Pelajaran" style="max-height: 58pt; max-width: 140pt; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" />
       </div>`
    : `<div style="height: 65pt;"></div>`;

  return `
  <div style="margin-top: 28pt; page-break-inside: avoid;">
    <table style="width: 100%; border: none !important; border-collapse: collapse; text-align: center; font-size: 10.5pt;" border="0">
      <tr style="border: none !important;">
        <td style="width: 40%; text-align: center; border: none !important; vertical-align: top; padding: 4pt 10pt;">
          Mengetahui,<br>
          <b>Kepala Sekolah</b>
          ${principalTteHtml}
          <b><u>${principalName}</u></b><br>
          <span>NIP. ${principalNip}</span>
        </td>
        <td style="width: 20%; border: none !important;"></td>
        <td style="width: 40%; text-align: center; border: none !important; vertical-align: top; padding: 4pt 10pt;">
          ${city}, ${dateString}<br>
          <b>Guru Mata Pelajaran</b>
          ${teacherTteHtml}
          <b><u>${teacherName}</u></b><br>
          <span>NIP. ${teacherNip}</span>
        </td>
      </tr>
    </table>
  </div>
  `;
}

/**
 * Injects TTE images into existing signature tables within HTML if present.
 */
export function injectTteIntoExistingTables(html: string, options: ExportOptions): string {
  if (!html || !options.includeSignature) return html;

  // Fallback to globally stored TTE config if options don't have them explicitly set
  let teacherTteImg = (options.useTeacherTte ? options.teacherTteImageUrl?.trim() : "") || "";
  let principalTteImg = (options.usePrincipalTte ? options.principalTteImageUrl?.trim() : "") || "";

  if (!teacherTteImg || !principalTteImg) {
    try {
      if (typeof window !== "undefined") {
        if (!teacherTteImg && (options.useTeacherTte ?? true)) {
          teacherTteImg = localStorage.getItem("guru_tte_image") || localStorage.getItem("eduasisten_teacher_tte_image") || "";
        }
        if (!principalTteImg && (options.usePrincipalTte ?? true)) {
          principalTteImg = localStorage.getItem("guru_headmaster_tte_image") || localStorage.getItem("eduasisten_principal_tte_image") || "";
        }
      }
    } catch {
      // ignore
    }
  }

  const hasTeacherTte = Boolean(teacherTteImg && (options.useTeacherTte ?? true));
  const hasPrincipalTte = Boolean(principalTteImg && (options.usePrincipalTte ?? true));

  if (!hasTeacherTte && !hasPrincipalTte) return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = Array.from(doc.querySelectorAll('table'));

    tables.forEach(table => {
      const text = (table.textContent || '').toLowerCase();
      const isSignatureTable = 
        (text.includes('kepala sekolah') || text.includes('mengetahui')) && 
        (text.includes('guru') || text.includes('wali') || text.includes('penyusun') || text.includes('pengampu') || text.includes('nip.') || text.includes('nip '));

      if (isSignatureTable) {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length >= 2) {
          // Look for an existing middle gap row
          let gapRow = rows.find((r, idx) => {
            if (idx === 0 || idx === rows.length - 1) return false;
            const cells = Array.from(r.querySelectorAll('td, th'));
            return cells.some(c => c.getAttribute('style')?.includes('height') || (c.textContent || '').trim() === '');
          });

          if (!gapRow && rows.length === 3) {
            gapRow = rows[1];
          }

          if (gapRow) {
            const cells = Array.from(gapRow.querySelectorAll('td, th'));
            if (cells.length >= 3) {
              if (hasPrincipalTte && cells[0]) {
                const imgUrl = formatDriveImageUrl(principalTteImg);
                cells[0].innerHTML = `<div style="height: 65px; display: flex; align-items: center; justify-content: center; text-align: center;"><img src="${imgUrl}" alt="TTE Kepala Sekolah" style="max-height: 58px; max-width: 140px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" /></div>`;
              }
              if (hasTeacherTte && cells[2]) {
                const imgUrl = formatDriveImageUrl(teacherTteImg);
                cells[2].innerHTML = `<div style="height: 65px; display: flex; align-items: center; justify-content: center; text-align: center;"><img src="${imgUrl}" alt="TTE Guru / Wali Kelas" style="max-height: 58px; max-width: 140px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" /></div>`;
              }
            } else if (cells.length === 2) {
              if (hasPrincipalTte && cells[0]) {
                const imgUrl = formatDriveImageUrl(principalTteImg);
                cells[0].innerHTML = `<div style="height: 65px; display: flex; align-items: center; justify-content: center; text-align: center;"><img src="${imgUrl}" alt="TTE Kepala Sekolah" style="max-height: 58px; max-width: 140px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" /></div>`;
              }
              if (hasTeacherTte && cells[1]) {
                const imgUrl = formatDriveImageUrl(teacherTteImg);
                cells[1].innerHTML = `<div style="height: 65px; display: flex; align-items: center; justify-content: center; text-align: center;"><img src="${imgUrl}" alt="TTE Guru / Wali Kelas" style="max-height: 58px; max-width: 140px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" /></div>`;
              }
            }
          } else if (rows.length === 2) {
            // Only title row and name row: insert images into the name row above names
            const nameCells = Array.from(rows[1].querySelectorAll('td, th'));
            if (nameCells.length >= 2) {
              if (hasPrincipalTte && nameCells[0] && !nameCells[0].querySelector('img')) {
                const imgUrl = formatDriveImageUrl(principalTteImg);
                const imgSnippet = `<div style="height: 60px; display: flex; align-items: center; justify-content: center; text-align: center; margin-bottom: 4px;"><img src="${imgUrl}" alt="TTE Kepala Sekolah" style="max-height: 54px; max-width: 130px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" /></div>`;
                nameCells[0].innerHTML = imgSnippet + nameCells[0].innerHTML;
              }
              const rightCellIdx = nameCells.length >= 3 ? 2 : 1;
              if (hasTeacherTte && nameCells[rightCellIdx] && !nameCells[rightCellIdx].querySelector('img')) {
                const imgUrl = formatDriveImageUrl(teacherTteImg);
                const imgSnippet = `<div style="height: 60px; display: flex; align-items: center; justify-content: center; text-align: center; margin-bottom: 4px;"><img src="${imgUrl}" alt="TTE Guru / Wali Kelas" style="max-height: 54px; max-width: 130px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" /></div>`;
                nameCells[rightCellIdx].innerHTML = imgSnippet + nameCells[rightCellIdx].innerHTML;
              }
            }
          }
        }
      }
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

/**
 * Builds the Word document styles with high-contrast, professional tables
 */
function buildWordDocumentStyles(pageSize: string, fontFamily: string): string {
  return `
    <style>
      @page SectionCover {
        size: ${pageSize};
        margin: 0cm 0cm 0cm 0cm;
        mso-header-margin: 0cm;
        mso-footer-margin: 0cm;
        mso-header: none;
        mso-footer: none;
      }
      div.CoverSection {
        page: SectionCover;
      }
      @page Section1 {
        size: ${pageSize};
        margin: 2.0cm 2.0cm 2.0cm 2.0cm;
        mso-header-margin: 28pt;
        mso-footer-margin: 28pt;
        mso-paper-source: 0;
      }
      div.Section1 {
        page: Section1;
      }
      @page SectionLandscape {
        size: ${pageSize.includes('330mm') ? '330mm 215mm' : '297mm 210mm'};
        margin: 1.5cm 1.5cm 1.5cm 1.5cm;
        mso-header-margin: 28pt;
        mso-footer-margin: 28pt;
        mso-page-orientation: landscape;
        mso-paper-source: 0;
      }
      div.LandscapeSection, div.page-landscape {
        page: SectionLandscape;
        mso-page-orientation: landscape;
        page-break-before: always;
        break-before: page;
      }
      .page-landscape table, div.LandscapeSection table {
        width: 100% !important;
        font-size: 8.5pt !important;
      }
      .page-landscape th, div.LandscapeSection th {
        padding: 3.5pt 4pt !important;
        font-size: 8.5pt !important;
      }
      .page-landscape td, div.LandscapeSection td {
        padding: 3.5pt 4pt !important;
        font-size: 8.5pt !important;
      }
      body {
        font-family: ${fontFamily};
        font-size: 11pt;
        color: #0f172a;
        line-height: 1.45;
        background-color: #ffffff;
      }
      p {
        margin-top: 0;
        margin-bottom: 6pt;
        line-height: 1.4;
        text-align: justify;
        text-justify: inter-ideograph;
      }
      h1, h2, h3, h4, h5 {
        font-family: ${fontFamily};
        color: #0f172a;
        font-weight: bold;
        page-break-after: avoid;
        mso-line-height-rule: exactly;
      }
      h1 {
        font-size: 14pt;
        text-align: center;
        text-transform: uppercase;
        margin-top: 14pt;
        margin-bottom: 8pt;
        color: #1e3a8a;
        border-bottom: 2pt solid #2563eb;
        padding-bottom: 4pt;
      }
      h2 {
        font-size: 12.5pt;
        margin-top: 12pt;
        margin-bottom: 6pt;
        color: #1e293b;
        border-bottom: 1pt solid #cbd5e1;
        padding-bottom: 2pt;
      }
      h3 {
        font-size: 11.5pt;
        margin-top: 10pt;
        margin-bottom: 4pt;
        color: #1e3a8a;
      }
      h4 {
        font-size: 11pt;
        margin-top: 8pt;
        margin-bottom: 3pt;
        color: #334155;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        table-layout: fixed !important;
        margin: 8pt 0 12pt 0 !important;
        font-size: 9.5pt !important;
        page-break-inside: auto;
        border: 1pt solid #000000 !important;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        mso-table-anchor-vertical: paragraph;
        mso-table-anchor-horizontal: column;
        mso-padding-alt: 4pt 6pt 4pt 6pt;
        mso-border-alt: solid windowtext 0.75pt !important;
        mso-border-insideh: 0.75pt solid windowtext !important;
        mso-border-insidev: 0.75pt solid windowtext !important;
      }
      table[style*="border: none"],
      table[style*="border:none"],
      table.signature-table,
      table.no-border {
        border: none !important;
        mso-border-alt: none !important;
        mso-border-insideh: none !important;
        mso-border-insidev: none !important;
        background-color: transparent !important;
        margin-top: 24pt !important;
        margin-bottom: 14pt !important;
      }
      table[style*="border: none"] td,
      table[style*="border:none"] td,
      table.signature-table td,
      table.no-border td {
        border: none !important;
        mso-border-alt: none !important;
        background-color: transparent !important;
        padding: 4pt 8pt !important;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
      }
      th {
        background-color: #1e3a8a !important;
        font-weight: bold !important;
        color: #ffffff !important;
        border: 1pt solid #000000 !important;
        border-bottom: 2pt solid #000000 !important;
        mso-border-alt: solid windowtext 0.75pt !important;
        padding: 4.5pt 6pt !important;
        text-align: left !important;
        vertical-align: middle !important;
        font-size: 9.5pt !important;
        text-transform: uppercase !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
        hyphens: none !important;
      }
      td {
        border: 1pt solid #000000 !important;
        mso-border-alt: solid windowtext 0.75pt !important;
        padding: 4.5pt 6pt !important;
        vertical-align: middle !important;
        line-height: 1.4 !important;
        color: #000000 !important;
        font-size: 9.5pt !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      tr:nth-child(even) td {
        background-color: #f8fafc !important;
      }
      td ul, td ol {
        margin-top: 2pt !important;
        margin-bottom: 4pt !important;
        padding-left: 14pt !important;
      }
      td li {
        margin-bottom: 2pt !important;
        line-height: 1.35 !important;
        text-align: justify;
        text-justify: inter-word;
      }
      ul, ol {
        margin-top: 2pt;
        margin-bottom: 6pt;
        padding-left: 20pt;
      }
      li {
        margin-bottom: 3pt;
        line-height: 1.4;
        text-align: justify;
      }
      blockquote {
        border-left: 3.5pt solid #2563eb;
        background-color: #f8fafc;
        color: #1e293b;
        padding: 6pt 10pt;
        margin: 8pt 0;
        font-style: normal;
        border-top: 0.5pt solid #e2e8f0;
        border-right: 0.5pt solid #e2e8f0;
        border-bottom: 0.5pt solid #e2e8f0;
        text-align: justify;
        text-justify: inter-word;
      }
      strong, b {
        color: #0f172a;
        font-weight: bold;
      }
      hr {
        border: none;
        border-top: 1pt solid #94a3b8;
        margin: 12pt 0;
      }
      .page-break {
        page-break-before: always;
      }
    </style>
  `;
}

/**
 * Generates and downloads a clean, beautifully formatted Microsoft Word (.doc) document
 */
export async function exportToWordFormatted(
  contentHtml: string, 
  userOptions?: Partial<ExportOptions>,
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string; tahunPelajaran?: string; alamatSekolah?: string; kontakSekolah?: string; }
): Promise<void> {
  const defaultProfileOptions: Partial<ExportOptions> = {
    customSchoolName: userProfile?.namaSekolah,
    customTeacherName: userProfile?.namaPenyusun,
    customTeacherNip: userProfile?.nipPenyusun,
    customPrincipalName: userProfile?.namaKepsek,
    customPrincipalNip: userProfile?.nipKepsek,
    customSchoolAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' - ' + userProfile.kontakSekolah : ''}` : undefined,
    coverSchool: userProfile?.namaSekolah,
    coverAuthor: userProfile?.namaPenyusun,
    coverNip: userProfile?.nipPenyusun,
    coverAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' • ' + userProfile.kontakSekolah : ''}` : undefined,
    coverYear: userProfile?.tahunPelajaran,
  };
  const options: ExportOptions = { ...DEFAULT_OPTIONS, ...defaultProfileOptions, ...userOptions };
  
  let contentToProcess = cleanIntroPreamble(contentHtml);
  if (options.exportMode === 'questions_only') {
    contentToProcess = extractQuestionsOnlyText(contentToProcess);
  } else if (options.exportMode === 'answers_only') {
    contentToProcess = extractAnswersOnlyText(contentToProcess);
  }

  const meta = detectDocumentMetadata(contentToProcess, userProfile, { title: options.coverTitle });
  if (options.coverTitle && options.coverTitle.trim()) {
    meta.title = options.coverTitle.trim();
  }
  if (options.exportMode === 'questions_only') {
    meta.title = `Naskah Soal ${meta.subject || 'Ujian'}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (options.exportMode === 'answers_only') {
    meta.title = `Kunci Jawaban & Pembahasan ${meta.subject || ''}`;
  }

  // Rasterize SVGs to PNG for proper Word Support
  const rasterizedHtml = await rasterizeSVGsToImages(contentToProcess);

  const sanitizedContent = sanitizeKatexAndHtml(rasterizedHtml, 'word');
  const finalContent = options.includeSignature ? injectTteIntoExistingTables(sanitizedContent, options) : stripSignatureBlock(sanitizedContent);
  const kopHtml = buildKopSuratHtml(options, meta);
  
  // Check if signature already exists in content to avoid double signature
  const hasExistingSignature = /Kepala Sekolah[\s\S]*?Guru Mata Pelajaran/i.test(finalContent) || /Mengetahui,[\s\S]*?Kepala Sekolah/i.test(finalContent);
  const signatureHtml = (!hasExistingSignature && options.includeSignature) ? buildSignatureBlockHtml(options, meta) : '';

  // Page dimensions
  const isF4 = options.paperSize === 'F4';
  const pageSize = isF4 ? '215mm 330mm' : '210mm 297mm'; // F4 vs A4
  const fontFamily = options.fontFamily === 'Times New Roman' ? "'Times New Roman', Times, serif" :
                     options.fontFamily === 'Arial' ? "Arial, Helvetica, sans-serif" :
                     "'Calibri', 'Segoe UI', Arial, sans-serif";

  const styles = buildWordDocumentStyles(pageSize, fontFamily);

  const coverHtml = options.includeCover ? buildCoverPageHtml(options, meta) : '';
  
  // Convert any landscape wrappers to MS Word landscape section breaks
  let wordReadyContent = finalContent;
  wordReadyContent = wordReadyContent.replace(
    /<div[^>]*class="[^"]*(?:page-landscape|landscape-section)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    `</div>
    <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
    <div class="LandscapeSection">
      $1
    </div>
    <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
    <div class="Section1">`
  );

  // High-fidelity rasterized images for MS Word (Word cannot render raw inline SVG)
  let geometricHeaderHtml = '';
  let geometricFooterHtml = '';
  if (options.includeGeometricFrame) {
    const headerPng = await rasterizeSingleSvg(getGeometricHeaderSvg(800, 110), 800, 110);
    const footerPng = await rasterizeSingleSvg(getGeometricFooterSvg(800, 110), 800, 110);
    geometricHeaderHtml = `
      <div style="margin-bottom: 14pt; text-align: center; width: 100%;">
        <img src="${headerPng}" width="720" height="99" style="width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto 12pt auto;" alt="Header Bingkai Geometris (Gambar 2)" />
      </div>
    `;
    geometricFooterHtml = `
      <div style="margin-top: 24pt; text-align: center; width: 100%;">
        <img src="${footerPng}" width="720" height="99" style="width: 100%; max-width: 720px; height: auto; display: block; margin: 18pt auto 0 auto;" alt="Footer Bingkai Geometris (Gambar 2)" />
      </div>
    `;
  }

  const wordHtml = `
    <html xmlns:v="urn:schemas-microsoft-com:vml"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      ${styles}
      <title>${meta.title}</title>
    </head>
    <body>
      ${coverHtml ? `
        <div class="CoverSection" style="page-break-after: always; mso-break-type: section-break; margin-bottom: 30pt;">
          ${coverHtml}
        </div>
        <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
      ` : ''}

      <!-- Halaman Dokumen Pembelajaran (Setelah Cover) dengan Header & Footer Geometris -->
      <div class="Section1">
        ${geometricHeaderHtml}
        ${kopHtml}
        ${wordReadyContent}
        ${signatureHtml}
        ${geometricFooterHtml}
      </div>
    </body>
    </html>
  `;

  // Generate safe filename
  const cleanFilename = `${meta.title.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50)}_${isF4 ? 'F4' : 'A4'}.doc`;
  
  const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates Word document as a Blob and clean filename without auto-downloading (useful for Drive upload)
 */
export async function generateWordDocumentBlob(
  contentHtml: string, 
  userOptions?: Partial<ExportOptions>,
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string; tahunPelajaran?: string; alamatSekolah?: string; kontakSekolah?: string; }
): Promise<{ blob: Blob; filename: string }> {
  const defaultProfileOptions: Partial<ExportOptions> = {
    customSchoolName: userProfile?.namaSekolah,
    customTeacherName: userProfile?.namaPenyusun,
    customTeacherNip: userProfile?.nipPenyusun,
    customPrincipalName: userProfile?.namaKepsek,
    customPrincipalNip: userProfile?.nipKepsek,
    customSchoolAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' - ' + userProfile.kontakSekolah : ''}` : undefined,
    coverSchool: userProfile?.namaSekolah,
    coverAuthor: userProfile?.namaPenyusun,
    coverNip: userProfile?.nipPenyusun,
    coverAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' • ' + userProfile.kontakSekolah : ''}` : undefined,
    coverYear: userProfile?.tahunPelajaran,
  };
  const options: ExportOptions = { ...DEFAULT_OPTIONS, ...defaultProfileOptions, ...userOptions };
  
  let contentToProcess = cleanIntroPreamble(contentHtml);
  if (options.exportMode === 'questions_only') {
    contentToProcess = extractQuestionsOnlyText(contentToProcess);
  } else if (options.exportMode === 'answers_only') {
    contentToProcess = extractAnswersOnlyText(contentToProcess);
  }

  const meta = detectDocumentMetadata(contentToProcess, userProfile, { title: options.coverTitle });
  if (options.coverTitle && options.coverTitle.trim()) {
    meta.title = options.coverTitle.trim();
  }
  if (options.exportMode === 'questions_only') {
    meta.title = `Naskah Soal ${meta.subject || 'Ujian'}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (options.exportMode === 'answers_only') {
    meta.title = `Kunci Jawaban & Pembahasan ${meta.subject || ''}`;
  }

  // Rasterize SVGs to PNG for proper Word Support
  const rasterizedHtml = await rasterizeSVGsToImages(contentToProcess);

  const sanitizedContent = sanitizeKatexAndHtml(rasterizedHtml, 'word');
  const finalContent = options.includeSignature ? injectTteIntoExistingTables(sanitizedContent, options) : stripSignatureBlock(sanitizedContent);
  const kopHtml = buildKopSuratHtml(options, meta);
  
  // Check if signature already exists in content to avoid double signature
  const hasExistingSignature = /Kepala Sekolah[\s\S]*?Guru Mata Pelajaran/i.test(finalContent) || /Mengetahui,[\s\S]*?Kepala Sekolah/i.test(finalContent);
  const signatureHtml = (!hasExistingSignature && options.includeSignature) ? buildSignatureBlockHtml(options, meta) : '';

  // Page dimensions
  const isF4 = options.paperSize === 'F4';
  const pageSize = isF4 ? '215mm 330mm' : '210mm 297mm'; // F4 vs A4
  const fontFamily = options.fontFamily === 'Times New Roman' ? "'Times New Roman', Times, serif" :
                     options.fontFamily === 'Arial' ? "Arial, Helvetica, sans-serif" :
                     "'Calibri', 'Segoe UI', Arial, sans-serif";

  const styles = buildWordDocumentStyles(pageSize, fontFamily);

  const coverHtml = options.includeCover ? buildCoverPageHtml(options, meta) : '';
  
  // Convert any landscape wrappers to MS Word landscape section breaks
  let wordReadyContent = finalContent;
  wordReadyContent = wordReadyContent.replace(
    /<div[^>]*class="[^"]*(?:page-landscape|landscape-section)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    `</div>
    <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
    <div class="LandscapeSection">
      $1
    </div>
    <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
    <div class="Section1">`
  );

  let geometricHeaderHtml = '';
  let geometricFooterHtml = '';
  if (options.includeGeometricFrame) {
    const headerPng = await rasterizeSingleSvg(getGeometricHeaderSvg(800, 110), 800, 110);
    const footerPng = await rasterizeSingleSvg(getGeometricFooterSvg(800, 110), 800, 110);
    geometricHeaderHtml = `
      <div style="margin-bottom: 14pt; text-align: center; width: 100%;">
        <img src="${headerPng}" width="720" height="99" style="width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto 12pt auto;" alt="Header Bingkai Geometris (Gambar 2)" />
      </div>
    `;
    geometricFooterHtml = `
      <div style="margin-top: 24pt; text-align: center; width: 100%;">
        <img src="${footerPng}" width="720" height="99" style="width: 100%; max-width: 720px; height: auto; display: block; margin: 18pt auto 0 auto;" alt="Footer Bingkai Geometris (Gambar 2)" />
      </div>
    `;
  }

  const wordHtml = `
    <html xmlns:v="urn:schemas-microsoft-com:vml"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      ${styles}
      <title>${meta.title}</title>
    </head>
    <body>
      ${coverHtml ? `
        <div class="CoverSection" style="page-break-after: always; mso-break-type: section-break; margin-bottom: 30pt;">
          ${coverHtml}
        </div>
        <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
      ` : ''}

      <!-- Halaman Dokumen Pembelajaran (Setelah Cover) dengan Header & Footer Geometris -->
      <div class="Section1">
        ${geometricHeaderHtml}
        ${kopHtml}
        ${wordReadyContent}
        ${signatureHtml}
        ${geometricFooterHtml}
      </div>
    </body>
    </html>
  `;

  const cleanFilename = `${meta.title.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50)}_${isF4 ? 'F4' : 'A4'}.doc`;
  const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
  return { blob, filename: cleanFilename };
}

/**
 * Opens a dedicated, high-resolution Print Window for direct printing or saving as PDF
 */
export function printDocumentFormatted(
  contentHtml: string, 
  userOptions?: Partial<ExportOptions>,
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string; tahunPelajaran?: string; alamatSekolah?: string; kontakSekolah?: string; }
): void {
  const defaultProfileOptions: Partial<ExportOptions> = {
    customSchoolName: userProfile?.namaSekolah,
    customTeacherName: userProfile?.namaPenyusun,
    customTeacherNip: userProfile?.nipPenyusun,
    customPrincipalName: userProfile?.namaKepsek,
    customPrincipalNip: userProfile?.nipKepsek,
    customSchoolAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' - ' + userProfile.kontakSekolah : ''}` : undefined,
    coverSchool: userProfile?.namaSekolah,
    coverAuthor: userProfile?.namaPenyusun,
    coverNip: userProfile?.nipPenyusun,
    coverAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' • ' + userProfile.kontakSekolah : ''}` : undefined,
    coverYear: userProfile?.tahunPelajaran,
  };
  const options: ExportOptions = { ...DEFAULT_OPTIONS, ...defaultProfileOptions, ...userOptions };
  
  let contentToProcess = cleanIntroPreamble(contentHtml);
  if (options.exportMode === 'questions_only') {
    contentToProcess = extractQuestionsOnlyText(contentToProcess);
  } else if (options.exportMode === 'answers_only') {
    contentToProcess = extractAnswersOnlyText(contentToProcess);
  }

  const meta = detectDocumentMetadata(contentToProcess, userProfile, { title: options.coverTitle });
  if (options.coverTitle && options.coverTitle.trim()) {
    meta.title = options.coverTitle.trim();
  }
  if (options.exportMode === 'questions_only') {
    meta.title = `Naskah Soal ${meta.subject || 'Ujian'}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (options.exportMode === 'answers_only') {
    meta.title = `Kunci Jawaban & Pembahasan ${meta.subject || ''}`;
  }

  const sanitizedContent = sanitizeKatexAndHtml(contentToProcess, 'print');
  const finalContent = options.includeSignature ? injectTteIntoExistingTables(sanitizedContent, options) : stripSignatureBlock(sanitizedContent);
  const kopHtml = buildKopSuratHtml(options, meta);
  
  const hasExistingSignature = /Kepala Sekolah[\s\S]*?Guru Mata Pelajaran/i.test(finalContent) || /Mengetahui,[\s\S]*?Kepala Sekolah/i.test(finalContent);
  const signatureHtml = (!hasExistingSignature && options.includeSignature) ? buildSignatureBlockHtml(options, meta) : '';

  const isF4 = options.paperSize === 'F4';
  const pagePaperSize = isF4 ? '215mm 330mm' : 'A4 portrait';
  const fontFamily = options.fontFamily === 'Times New Roman' ? "'Times New Roman', Times, serif" :
                     options.fontFamily === 'Arial' ? "Arial, Helvetica, sans-serif" :
                     "'Calibri', 'Segoe UI', Arial, sans-serif";

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Jendela pop-up cetak terblokir oleh browser. Harap izinkan pop-up untuk mencetak dokumen.');
    return;
  }

  const coverHtml = options.includeCover ? buildCoverPageHtml(options, meta) : '';
  const geometricHeaderSvg = options.includeGeometricFrame ? getGeometricHeaderSvg(800, 95) : '';
  const geometricFooterSvg = options.includeGeometricFrame ? getGeometricFooterSvg(800, 95) : '';

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${meta.title}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <style>
        @page {
          size: ${pagePaperSize};
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: ${fontFamily};
          font-size: 11pt;
          color: #0f172a;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          background: #f1f5f9;
        }
        .cover-page-section {
          page-break-after: always;
          break-after: page;
          position: relative;
          z-index: 99999;
          background-color: #072a4a;
        }
        .document-pages-section {
          position: relative;
          background-color: #ffffff;
        }
        .document-print-table {
          width: 100% !important;
          border: none !important;
          border-collapse: collapse !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .document-print-table thead {
          display: table-header-group;
        }
        .document-print-table tfoot {
          display: table-footer-group;
        }
        .document-print-table tbody tr {
          page-break-inside: auto;
        }
        .document-print-table td {
          border: none !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .geometric-header-box {
          width: 100%;
          overflow: hidden;
          margin-bottom: 4pt;
        }
        .geometric-footer-box {
          width: 100%;
          overflow: hidden;
          margin-top: 8pt;
        }
        .container {
          max-width: 820px;
          margin: 0 auto;
          position: relative;
          z-index: 60;
          padding: ${options.includeGeometricFrame ? '10px 35px 20px 35px' : '30px 35px'};
          background: #ffffff;
        }
        p {
          margin-top: 0;
          margin-bottom: 7pt;
          line-height: 1.45;
          text-align: justify;
        }
        h1, h2, h3, h4 {
          font-family: ${fontFamily};
          color: #0f172a;
          font-weight: bold;
          page-break-after: avoid;
        }
        h1 {
          font-size: 14pt;
          text-align: center;
          text-transform: uppercase;
          margin-top: 14pt;
          margin-bottom: 8pt;
          color: #1e3a8a;
          border-bottom: 2pt solid #2563eb;
          padding-bottom: 4pt;
        }
        h2 {
          font-size: 12.5pt;
          margin-top: 12pt;
          margin-bottom: 6pt;
          color: #1e293b;
          border-bottom: 1pt solid #cbd5e1;
          padding-bottom: 3pt;
        }
        h3 {
          font-size: 11.5pt;
          margin-top: 10pt;
          margin-bottom: 4pt;
          color: #1e3a8a;
        }
        @page landscape-section {
          size: landscape;
          margin: 10mm 15mm 10mm 15mm;
        }
        .page-landscape, div.LandscapeSection {
          width: 100% !important;
          max-width: 100% !important;
          page: landscape-section !important;
          page-break-before: always !important;
          break-before: page !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        .page-landscape table, div.LandscapeSection table {
          width: 100% !important;
          font-size: 8.5pt !important;
        }
        .page-landscape th, div.LandscapeSection th {
          padding: 3.5pt 4pt !important;
          font-size: 8.5pt !important;
        }
        .page-landscape td, div.LandscapeSection td {
          padding: 3.5pt 4pt !important;
          font-size: 8.5pt !important;
        }
        table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          margin: 8pt 0 12pt 0 !important;
          font-size: 9.5pt !important;
          page-break-inside: auto;
          background-color: #ffffff;
          border: 1pt solid #000000 !important;
        }
        table[style*="border: none"],
        table[style*="border:none"],
        table.signature-table,
        table.no-border {
          border: none !important;
          background-color: transparent !important;
          margin-top: 24pt !important;
          margin-bottom: 14pt !important;
        }
        table[style*="border: none"] td,
        table[style*="border:none"] td,
        table.signature-table td,
        table.no-border td {
          border: none !important;
          background-color: transparent !important;
          padding: 4pt 8pt !important;
        }
        thead {
          display: table-header-group;
        }
        tr {
          page-break-inside: avoid;
        }
        th {
          background-color: #1e3a8a !important;
          color: #ffffff !important;
          font-weight: bold !important;
          border: 1pt solid #000000 !important;
          border-bottom: 2pt solid #000000 !important;
          padding: 4.5pt 6pt !important;
          text-align: left !important;
          vertical-align: middle !important;
          font-size: 9.5pt !important;
          text-transform: uppercase !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          hyphens: none !important;
        }
        td {
          border: 1pt solid #000000 !important;
          padding: 4.5pt 6pt !important;
          vertical-align: middle !important;
          line-height: 1.4 !important;
          color: #000000 !important;
          font-size: 9.5pt !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc !important;
        }
        td ul, td ol {
          margin-top: 2pt !important;
          margin-bottom: 4pt !important;
          padding-left: 14pt !important;
        }
        td li {
          margin-bottom: 2pt !important;
          line-height: 1.35 !important;
          text-align: justify !important;
          text-justify: inter-word !important;
          word-wrap: break-word !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
        .katex {
          font-size: 1em !important;
          line-height: 1.2 !important;
        }
        .katex-mathml {
          display: none !important;
        }
        ul, ol {
          margin-top: 3pt;
          margin-bottom: 7pt;
          padding-left: 20pt;
        }
        li {
          margin-bottom: 3pt;
          line-height: 1.4;
          text-align: justify !important;
          text-justify: inter-word !important;
          word-wrap: break-word !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
        blockquote {
          border-left: 3.5pt solid #2563eb;
          background-color: #f8fafc !important;
          padding: 7pt 12pt;
          margin: 9pt 0;
          border-radius: 4pt;
          border-top: 1pt solid #e2e8f0;
          border-right: 1pt solid #e2e8f0;
          border-bottom: 1pt solid #e2e8f0;
          text-align: justify !important;
          text-justify: inter-word !important;
          word-wrap: break-word !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
        @media screen {
          body {
            padding: 30px 15px;
          }
          .cover-page-section {
            max-width: 820px;
            margin: 0 auto 30px auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.18);
            border-radius: 8px;
            overflow: hidden;
          }
          .document-pages-section {
            max-width: 820px;
            margin: 0 auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.18);
            border-radius: 8px;
            overflow: hidden;
          }
        }
        @media print {
          body {
            background-color: #ffffff;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .cover-page-section {
            width: 100vw !important;
            height: 100vh !important;
            min-height: 100vh !important;
            page-break-after: always;
            break-after: page;
            margin: 0 !important;
            padding: 0 !important;
          }
          .document-pages-section {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .document-print-table {
            width: 100% !important;
          }
          .document-print-table thead {
            display: table-header-group !important;
          }
          .document-print-table tfoot {
            display: table-footer-group !important;
          }
          .geometric-header-box {
            width: 100% !important;
            margin-bottom: 2mm !important;
          }
          .geometric-footer-box {
            width: 100% !important;
            margin-top: 3mm !important;
          }
          .container {
            max-width: 100% !important;
            padding: ${options.includeGeometricFrame ? '3mm 16mm 3mm 16mm !important' : '20mm 15mm 20mm 15mm !important'};
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 999999; background: #ffffff; padding: 8px 14px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); border: 1px solid #cbd5e1; display: flex; gap: 8px; align-items: center;">
        <span style="font-size: 11px; font-weight: bold; color: #475569; margin-right: 4px;">Jang Guru Super App</span>
        <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          🖨️ Cetak / Simpan PDF
        </button>
        <button onclick="window.close()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
          ✕ Tutup
        </button>
      </div>

      ${coverHtml ? `
        <div class="cover-page-section">
          ${coverHtml}
        </div>
      ` : ''}

      <!-- Halaman Dokumen Pembelajaran (Setelah Cover) -->
      <div class="document-pages-section">
        <table class="document-print-table">
          ${options.includeGeometricFrame ? `
            <thead>
              <tr>
                <td>
                  <div class="geometric-header-box">
                    ${geometricHeaderSvg}
                  </div>
                </td>
              </tr>
            </thead>
          ` : ''}
          <tbody>
            <tr>
              <td>
                <div class="container">
                  ${kopHtml}
                  ${finalContent}
                  ${signatureHtml}
                </div>
              </td>
            </tr>
          </tbody>
          ${options.includeGeometricFrame ? `
            <tfoot>
              <tr>
                <td>
                  <div class="geometric-footer-box">
                    ${geometricFooterSvg}
                  </div>
                </td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

/**
 * Copies Rich Formatted HTML directly to Clipboard for instant paste into MS Word / Google Docs
 */
export async function copyFormattedRichText(
  contentHtml: string, 
  userOptions?: Partial<ExportOptions>,
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string; tahunPelajaran?: string; alamatSekolah?: string; kontakSekolah?: string; }
): Promise<boolean> {
  const defaultProfileOptions: Partial<ExportOptions> = {
    customSchoolName: userProfile?.namaSekolah,
    customTeacherName: userProfile?.namaPenyusun,
    customTeacherNip: userProfile?.nipPenyusun,
    customPrincipalName: userProfile?.namaKepsek,
    customPrincipalNip: userProfile?.nipKepsek,
    customSchoolAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' - ' + userProfile.kontakSekolah : ''}` : undefined,
    coverSchool: userProfile?.namaSekolah,
    coverAuthor: userProfile?.namaPenyusun,
    coverNip: userProfile?.nipPenyusun,
    coverAddress: userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' • ' + userProfile.kontakSekolah : ''}` : undefined,
    coverYear: userProfile?.tahunPelajaran,
  };
  const options: ExportOptions = { ...DEFAULT_OPTIONS, ...defaultProfileOptions, ...userOptions };
  
  let contentToProcess = cleanIntroPreamble(contentHtml);
  if (options.exportMode === 'questions_only') {
    contentToProcess = extractQuestionsOnlyText(contentToProcess);
  } else if (options.exportMode === 'answers_only') {
    contentToProcess = extractAnswersOnlyText(contentToProcess);
  }

  const meta = detectDocumentMetadata(contentToProcess, userProfile, { title: options.coverTitle });
  if (options.coverTitle && options.coverTitle.trim()) {
    meta.title = options.coverTitle.trim();
  }
  if (options.exportMode === 'questions_only') {
    meta.title = `Naskah Soal ${meta.subject || 'Ujian'}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (options.exportMode === 'answers_only') {
    meta.title = `Kunci Jawaban & Pembahasan ${meta.subject || ''}`;
  }

  const sanitizedContent = sanitizeKatexAndHtml(contentToProcess, 'clipboard');
  const finalContent = options.includeSignature ? injectTteIntoExistingTables(sanitizedContent, options) : stripSignatureBlock(sanitizedContent);
  const kopHtml = buildKopSuratHtml(options, meta);
  
  const hasExistingSignature = /Kepala Sekolah[\s\S]*?Guru Mata Pelajaran/i.test(finalContent) || /Mengetahui,[\s\S]*?Kepala Sekolah/i.test(finalContent);
  const signatureHtml = (!hasExistingSignature && options.includeSignature) ? buildSignatureBlockHtml(options, meta) : '';
  const coverHtml = options.includeCover ? buildCoverPageHtml(options, meta) : '';

  const fullHtml = `
    <div style="font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.5;">
      ${coverHtml ? `<div style="margin-bottom: 24pt;">${coverHtml}</div>` : ''}
      ${kopHtml}
      ${finalContent}
      ${signatureHtml}
    </div>
  `;

  const plainText = finalContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        })
      ]);
      return true;
    } else {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
    // Fallback
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}
