// Document Exporter Engine for EduAsisten AI
// Provides high-fidelity Microsoft Word (.doc), Print/PDF (A4/F4), and Rich-Text Clipboard generation

import { formatDriveImageUrl } from "./driveUtils";

export interface DocMetadata {
  title: string;
  subject?: string;
  grade?: string;
  topic?: string;
  docType?: 'modul' | 'soal' | 'atp' | 'rubrik' | 'penilaian' | 'umum';
  schoolName?: string;
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
}

const DEFAULT_OPTIONS: ExportOptions = {
  paperSize: 'A4',
  fontFamily: 'Calibri',
  includeKop: true,
  kopType: 'text',
  includeSignature: true,
  exportMode: 'full',
};

/**
 * Extracts metadata (Title, Mapel, Kelas, Bab, DocType) automatically from AI output content
 */
export function detectDocumentMetadata(
  content: string, 
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string }
): DocMetadata {
  const meta: DocMetadata = {
    title: 'Dokumen Administrasi Pembelajaran',
    docType: 'umum',
    schoolName: userProfile?.namaSekolah || 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI',
    teacherName: userProfile?.namaPenyusun || 'Guru Mata Pelajaran',
    teacherNip: userProfile?.nipPenyusun || '',
    principalName: userProfile?.namaKepsek || '',
    principalNip: userProfile?.nipKepsek || '',
    academicYear: '2025/2026',
  };

  if (!content) return meta;

  // Detect Doc Type
  if (/MODUL AJAR|RPPM|DEEP LEARNING/i.test(content)) {
    meta.docType = 'modul';
    meta.title = 'Modul Ajar Deep Learning';
  } else if (/SOAL NO\.|PAKET SOAL|KISI-KISI|PILGAN|PILIHAN GANDA/i.test(content)) {
    meta.docType = 'soal';
    meta.title = 'Naskah Soal Evaluasi Pembelajaran';
  } else if (/CAPAIAN PEMBELAJARAN|ALUR TUJUAN|ATP|TP /i.test(content)) {
    meta.docType = 'atp';
    meta.title = 'Analisis Capaian & Alur Tujuan Pembelajaran';
  } else if (/RUBRIK PENILAIAN|KRITERIA EVALUASI/i.test(content)) {
    meta.docType = 'rubrik';
    meta.title = 'Rubrik Penilaian Pembelajaran';
  } else if (/HASIL PENILAIAN AI|LEMBAR KOREKSI/i.test(content)) {
    meta.docType = 'penilaian';
    meta.title = 'Laporan Hasil Penilaian AI';
  }

  // Extract Subject (Mata Pelajaran)
  const mapelMatch = content.match(/MATA\s+PELAJARAN\s*[:=]\s*([^\n\r*#|]+)/i) || 
                     content.match(/\*\*Mata Pelajaran\*\*\s*[:|]\s*([^\n\r*#|]+)/i) ||
                     content.match(/Mapel\s*[:=]\s*([^\n\r*#|]+)/i);
  if (mapelMatch && mapelMatch[1]) {
    meta.subject = mapelMatch[1].trim();
  }

  // Extract Topic / BAB
  const babMatch = content.match(/BAB\s*[\d\w]*\s*[:\-]\s*([^\n\r*#|]+)/i) ||
                   content.match(/Topik\s*[:=]\s*([^\n\r*#|]+)/i) ||
                   content.match(/Materi\s*Pokok\s*[:=]\s*([^\n\r*#|]+)/i);
  if (babMatch && babMatch[1]) {
    meta.topic = babMatch[1].trim();
  }

  // Extract Grade (Kelas/Fase)
  const kelasMatch = content.match(/Kelas\s*\/[^\n:]*[:=]\s*([^\n\r*#|]+)/i) ||
                     content.match(/Fase\s*[:=]\s*([^\n\r*#|]+)/i);
  if (kelasMatch && kelasMatch[1]) {
    meta.grade = kelasMatch[1].trim();
  }

  // Refine Title
  if (meta.docType === 'modul' && meta.subject) {
    meta.title = `Modul Ajar Deep Learning - ${meta.subject}${meta.topic ? ` (${meta.topic})` : ''}`;
  } else if (meta.docType === 'soal' && meta.subject) {
    meta.title = `Naskah Soal ${meta.subject}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (meta.docType === 'atp' && meta.subject) {
    meta.title = `Analisis CP dan ATP - ${meta.subject}`;
  }

  return meta;
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
 * Cleans KaTeX and nested DOM elements for clean Word & Print formatting
 */
function sanitizeKatexAndHtml(html: string, target: 'word' | 'print' | 'clipboard' = 'word'): string {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

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

  // 3. Transform and style tables for MS Word
  doc.querySelectorAll('table').forEach(table => {
    table.setAttribute("border", "1");
    table.setAttribute("cellpadding", "6");
    table.setAttribute("cellspacing", "0");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.margin = "10pt 0 14pt 0";
    table.style.border = "1pt solid #334155";
    // MSO specific styles as string
    const currentStyle = table.getAttribute('style') || "";
    table.setAttribute('style', currentStyle + "; mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-table-anchor-vertical: paragraph; mso-table-anchor-horizontal: column;");
  });

  doc.querySelectorAll('th').forEach(th => {
    th.style.backgroundColor = "#f1f5f9";
    th.style.color = "#0f172a";
    th.style.fontWeight = "bold";
    th.style.border = "1pt solid #475569";
    th.style.padding = "6pt 8pt";
    th.style.textAlign = "left";
    th.style.verticalAlign = "middle";
  });

  doc.querySelectorAll('td').forEach(td => {
    td.style.border = "1pt solid #64748b";
    td.style.padding = "5pt 8pt";
    td.style.textAlign = "left";
    td.style.verticalAlign = "top";
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

  let content = html;

  // Cut off everything starting from "KUNCI JAWABAN", "PEMBAHASAN", or "RUBRIK PENSKORAN"
  const answerSectionRegex = /<(h[1-6]|p|div|strong|b)[^>]*>[\s\S]*?(?:KUNCI\s+JAWABAN|PEMBAHASAN\s+SOAL|KUNCI\s+DAN\s+PEMBAHASAN|RUBRIK\s+PENSKORAN|KUNCI\s+JAWABAN\s*&|PEDOMAN\s+PENSKORAN)[\s\S]*?<\/\1>[\s\S]*/i;
  if (answerSectionRegex.test(content)) {
    content = content.replace(answerSectionRegex, "");
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

  const answerSectionMatch = html.match(/<(h[1-6]|p|div|strong|b)[^>]*>[\s\S]*?(?:KUNCI\s+JAWABAN|PEMBAHASAN\s+SOAL|KUNCI\s+DAN\s+PEMBAHASAN|KUNCI\s+JAWABAN\s*&|PEDOMAN\s+PENSKORAN)[\s\S]*?<\/\1>[\s\S]*/i);
  if (answerSectionMatch && answerSectionMatch.index !== undefined) {
    return html.substring(answerSectionMatch.index).trim();
  }

  return html;
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
  const address = options.customSchoolAddress || 'Jl. Pendidikan Nasional No. 1 - Kurikulum Merdeka Terintegrasi';

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

  return `
  <div style="margin-top: 28pt; page-break-inside: avoid;">
    <table style="width: 100%; border: none !important; border-collapse: collapse; text-align: center; font-size: 10.5pt;" border="0">
      <tr style="border: none !important;">
        <td style="width: 50%; text-align: center; border: none !important; vertical-align: top; padding: 4pt 10pt;">
          Mengetahui,<br>
          <b>Kepala Sekolah</b>
          <div style="height: 65pt;"></div>
          <b><u>${principalName}</u></b><br>
          <span>NIP. ${principalNip}</span>
        </td>
        <td style="width: 50%; text-align: center; border: none !important; vertical-align: top; padding: 4pt 10pt;">
          ${city}, ${dateString}<br>
          <b>Guru Mata Pelajaran</b>
          <div style="height: 65pt;"></div>
          <b><u>${teacherName}</u></b><br>
          <span>NIP. ${teacherNip}</span>
        </td>
      </tr>
    </table>
  </div>
  `;
}

/**
 * Generates and downloads a clean, beautifully formatted Microsoft Word (.doc) document
 */
export async function exportToWordFormatted(
  contentHtml: string, 
  userOptions?: Partial<ExportOptions>,
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string }
): Promise<void> {
  const options: ExportOptions = { ...DEFAULT_OPTIONS, ...userOptions };
  
  let contentToProcess = contentHtml;
  if (options.exportMode === 'questions_only') {
    contentToProcess = extractQuestionsOnlyText(contentHtml);
  } else if (options.exportMode === 'answers_only') {
    contentToProcess = extractAnswersOnlyText(contentHtml);
  }

  const meta = detectDocumentMetadata(contentHtml, userProfile);
  if (options.exportMode === 'questions_only') {
    meta.title = `Naskah Soal ${meta.subject || 'Ujian'}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (options.exportMode === 'answers_only') {
    meta.title = `Kunci Jawaban & Pembahasan ${meta.subject || ''}`;
  }

  // Rasterize SVGs to PNG for proper Word Support
  const rasterizedHtml = await rasterizeSVGsToImages(contentToProcess);

  const sanitizedContent = sanitizeKatexAndHtml(rasterizedHtml, 'word');
  const kopHtml = buildKopSuratHtml(options, meta);
  
  // Check if signature already exists in content to avoid double signature
  const hasExistingSignature = /Kepala Sekolah[\s\S]*?Guru Mata Pelajaran/i.test(sanitizedContent) || /Mengetahui,[\s\S]*?Kepala Sekolah/i.test(sanitizedContent);
  const signatureHtml = (!hasExistingSignature && options.includeSignature) ? buildSignatureBlockHtml(options, meta) : '';

  // Page dimensions
  const isF4 = options.paperSize === 'F4';
  const pageSize = isF4 ? '215mm 330mm' : '210mm 297mm'; // F4 vs A4
  const fontFamily = options.fontFamily === 'Times New Roman' ? "'Times New Roman', Times, serif" :
                     options.fontFamily === 'Arial' ? "Arial, Helvetica, sans-serif" :
                     "'Calibri', 'Segoe UI', Arial, sans-serif";

  const styles = `
    <style>
      @page Section1 {
        size: ${pageSize};
        margin: 2.5cm 2.0cm 2.5cm 2.0cm;
        mso-header-margin: 36pt;
        mso-footer-margin: 36pt;
        mso-paper-source: 0;
      }
      div.Section1 {
        page: Section1;
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
        margin: 8pt 0 12pt 0 !important;
        font-size: 10pt !important;
        page-break-inside: avoid;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        mso-table-anchor-vertical: paragraph;
        mso-table-anchor-horizontal: column;
        mso-padding-alt: 4pt 6pt 4pt 6pt;
      }
      th {
        background-color: #f1f5f9;
        font-weight: bold;
        color: #0f172a;
        border: 1pt solid #475569;
        padding: 5pt 7pt;
        text-align: left;
        vertical-align: middle;
      }
      td {
        border: 1pt solid #64748b;
        padding: 4.5pt 7pt;
        text-align: left;
        vertical-align: top;
        line-height: 1.35;
      }
      tr:nth-child(even) td {
        background-color: #f8fafc;
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
      <div class="Section1">
        ${kopHtml}
        ${sanitizedContent}
        ${signatureHtml}
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
 * Opens a dedicated, high-resolution Print Window for direct printing or saving as PDF
 */
export function printDocumentFormatted(
  contentHtml: string, 
  userOptions?: Partial<ExportOptions>,
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string }
): void {
  const options: ExportOptions = { ...DEFAULT_OPTIONS, ...userOptions };
  
  let contentToProcess = contentHtml;
  if (options.exportMode === 'questions_only') {
    contentToProcess = extractQuestionsOnlyText(contentHtml);
  } else if (options.exportMode === 'answers_only') {
    contentToProcess = extractAnswersOnlyText(contentHtml);
  }

  const meta = detectDocumentMetadata(contentHtml, userProfile);
  if (options.exportMode === 'questions_only') {
    meta.title = `Naskah Soal ${meta.subject || 'Ujian'}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (options.exportMode === 'answers_only') {
    meta.title = `Kunci Jawaban & Pembahasan ${meta.subject || ''}`;
  }

  const sanitizedContent = sanitizeKatexAndHtml(contentToProcess, 'print');
  const kopHtml = buildKopSuratHtml(options, meta);
  
  const hasExistingSignature = /Kepala Sekolah[\s\S]*?Guru Mata Pelajaran/i.test(sanitizedContent) || /Mengetahui,[\s\S]*?Kepala Sekolah/i.test(sanitizedContent);
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
          margin: 20mm 15mm 20mm 15mm;
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
          padding: 15px;
          background: #ffffff;
        }
        .container {
          max-width: 820px;
          margin: 0 auto;
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
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 10pt 0 14pt 0 !important;
          font-size: 10pt !important;
          page-break-inside: avoid;
        }
        thead {
          display: table-header-group;
        }
        tr {
          page-break-inside: avoid;
        }
        th {
          background-color: #f1f5f9 !important;
          color: #0f172a;
          font-weight: bold;
          border: 1pt solid #475569 !important;
          padding: 6pt 8pt;
          text-align: left;
          vertical-align: middle;
        }
        td {
          border: 1pt solid #64748b !important;
          padding: 5pt 8pt;
          text-align: left;
          vertical-align: top;
          line-height: 1.4;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc !important;
        }
        ul, ol {
          margin-top: 3pt;
          margin-bottom: 7pt;
          padding-left: 20pt;
        }
        li {
          margin-bottom: 3pt;
          line-height: 1.4;
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
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: #ffffff; padding: 8px 12px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; display: flex; gap: 8px;">
        <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
          🖨️ Cetak / Simpan PDF
        </button>
        <button onclick="window.close()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
          ✕ Tutup
        </button>
      </div>

      <div class="container">
        ${kopHtml}
        ${sanitizedContent}
        ${signatureHtml}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
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
  userProfile?: { namaSekolah?: string; namaPenyusun?: string; nipPenyusun?: string; namaKepsek?: string; nipKepsek?: string }
): Promise<boolean> {
  const options: ExportOptions = { ...DEFAULT_OPTIONS, ...userOptions };
  
  let contentToProcess = contentHtml;
  if (options.exportMode === 'questions_only') {
    contentToProcess = extractQuestionsOnlyText(contentHtml);
  } else if (options.exportMode === 'answers_only') {
    contentToProcess = extractAnswersOnlyText(contentHtml);
  }

  const meta = detectDocumentMetadata(contentHtml, userProfile);
  if (options.exportMode === 'questions_only') {
    meta.title = `Naskah Soal ${meta.subject || 'Ujian'}${meta.grade ? ` ${meta.grade}` : ''}`;
  } else if (options.exportMode === 'answers_only') {
    meta.title = `Kunci Jawaban & Pembahasan ${meta.subject || ''}`;
  }

  const sanitizedContent = sanitizeKatexAndHtml(contentToProcess, 'clipboard');
  const kopHtml = buildKopSuratHtml(options, meta);
  
  const hasExistingSignature = /Kepala Sekolah[\s\S]*?Guru Mata Pelajaran/i.test(sanitizedContent) || /Mengetahui,[\s\S]*?Kepala Sekolah/i.test(sanitizedContent);
  const signatureHtml = (!hasExistingSignature && options.includeSignature) ? buildSignatureBlockHtml(options, meta) : '';

  const fullHtml = `
    <div style="font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.5;">
      ${kopHtml}
      ${sanitizedContent}
      ${signatureHtml}
    </div>
  `;

  const plainText = sanitizedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

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
