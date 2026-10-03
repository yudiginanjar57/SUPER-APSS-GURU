// Template Assets and Vector Graphics for EduAsisten Document Exporter
// Faithful reproduction of Cover Page (Gambar 1) and Modern Geometric Header/Footer Frame (Gambar 2)

import { ExportOptions, DocMetadata } from "./documentExporter";

/**
 * Jang Guru Super App Brand Icon (Interlocking Ribbon vector)
 */
export const JANG_GURU_LOGO_SVG = `
<svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
  <path d="M10 26L22 14C23.5 12.5 26 12.5 27.5 14L28.5 15C30 16.5 30 19 28.5 20.5L16.5 32.5C15 34 12.5 34 11 32.5L10 31.5C8.5 30 8.5 27.5 10 26Z" fill="white" fill-opacity="0.95"/>
  <path d="M13.5 12.5L25.5 24.5C27 26 27 28.5 25.5 30L24.5 31C23 32.5 20.5 32.5 19 31L7 19C5.5 17.5 5.5 15 7 13.5L8 12.5C9.5 11 12 11 13.5 12.5Z" fill="white" fill-opacity="0.75"/>
</svg>
`;

/**
 * Architectural school/campus facade silhouette graphic for the cover background
 */
export const BUILDING_SILHOUETTE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="100%" height="100%" preserveAspectRatio="xMidYMax slice" style="opacity: 0.16;">
  <defs>
    <linearGradient id="bldgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.3"/>
    </linearGradient>
  </defs>
  
  <!-- Distant campus buildings -->
  <rect x="40" y="280" width="160" height="320" fill="url(#bldgGrad)"/>
  <rect x="60" y="310" width="25" height="40" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="100" y="310" width="25" height="40" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="140" y="310" width="25" height="40" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="60" y="380" width="25" height="40" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="100" y="380" width="25" height="40" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="140" y="380" width="25" height="40" rx="3" fill="#0284c7" opacity="0.4"/>

  <!-- Clock Tower / Main Academic Wing -->
  <rect x="240" y="160" width="220" height="440" fill="url(#bldgGrad)"/>
  <polygon points="220,160 350,70 480,160" fill="url(#bldgGrad)"/>
  <rect x="345" y="40" width="10" height="35" fill="white"/>
  
  <!-- Clock face -->
  <circle cx="350" cy="125" r="26" fill="#ffffff" opacity="0.95"/>
  <circle cx="350" cy="125" r="22" fill="#0369a1" opacity="0.35"/>
  <line x1="350" y1="125" x2="350" y2="112" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="350" y1="125" x2="360" y2="125" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>

  <!-- Tower Neoclassical Balcony & Pillars -->
  <rect x="255" y="220" width="190" height="15" rx="2" fill="white"/>
  <rect x="270" y="245" width="20" height="140" fill="white" opacity="0.9"/>
  <rect x="310" y="245" width="20" height="140" fill="white" opacity="0.9"/>
  <rect x="370" y="245" width="20" height="140" fill="white" opacity="0.9"/>
  <rect x="410" y="245" width="20" height="140" fill="white" opacity="0.9"/>
  <rect x="255" y="390" width="190" height="18" rx="2" fill="white"/>

  <!-- Center Portico & Entrance Hall -->
  <rect x="460" y="250" width="340" height="350" fill="url(#bldgGrad)"/>
  <polygon points="450,250 630,170 810,250" fill="url(#bldgGrad)"/>
  
  <!-- Portico Grand Columns -->
  <rect x="490" y="270" width="24" height="200" fill="white" opacity="0.85"/>
  <rect x="540" y="270" width="24" height="200" fill="white" opacity="0.85"/>
  <rect x="590" y="270" width="24" height="200" fill="white" opacity="0.85"/>
  <rect x="640" y="270" width="24" height="200" fill="white" opacity="0.85"/>
  <rect x="690" y="270" width="24" height="200" fill="white" opacity="0.85"/>
  <rect x="740" y="270" width="24" height="200" fill="white" opacity="0.85"/>
  
  <!-- Arched windows and doors -->
  <path d="M505 500 C505 470, 555 470, 555 500 L555 600 L505 600 Z" fill="#0284c7" opacity="0.5"/>
  <path d="M605 480 C605 440, 675 440, 675 480 L675 600 L605 600 Z" fill="#0284c7" opacity="0.6"/>
  <path d="M725 500 C725 470, 775 470, 775 500 L775 600 L725 600 Z" fill="#0284c7" opacity="0.5"/>

  <!-- Right Wing -->
  <rect x="800" y="300" width="180" height="300" fill="url(#bldgGrad)"/>
  <rect x="830" y="340" width="30" height="45" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="890" y="340" width="30" height="45" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="830" y="420" width="30" height="45" rx="3" fill="#0284c7" opacity="0.4"/>
  <rect x="890" y="420" width="30" height="45" rx="3" fill="#0284c7" opacity="0.4"/>

  <!-- Ground Plaza and Streetlamps -->
  <rect x="0" y="580" width="1000" height="20" fill="white" opacity="0.7"/>
  <!-- Streetlamp left -->
  <line x1="180" y1="580" x2="180" y2="460" stroke="white" stroke-width="4"/>
  <path d="M165 460 Q180 445 195 460" stroke="white" stroke-width="3" fill="none"/>
  <circle cx="180" cy="455" r="7" fill="#fef08a"/>
  <!-- Streetlamp right -->
  <line x1="840" y1="580" x2="840" y2="460" stroke="white" stroke-width="4"/>
  <path d="M825 460 Q840 445 855 460" stroke="white" stroke-width="3" fill="none"/>
  <circle cx="840" cy="455" r="7" fill="#fef08a"/>
</svg>
`;

/**
 * Geometric Modern Header SVG (Gambar 2 Header)
 * Features:
 * - Top-left bright yellow bar
 * - Angled navy cut
 * - Dark navy top edge
 * - Top-right sharp geometric navy block with golden yellow 45-deg diagonal stripe
 * - White halftone dot matrix pattern in top right corner
 */
export function getGeometricHeaderSvg(width = 800, height = 110): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 110" width="100%" height="${height}" preserveAspectRatio="none" style="display: block; width: 100%;">
  <!-- Top Left Bright Yellow Accent Bar -->
  <rect x="0" y="0" width="220" height="10" fill="#f59e0b" />
  
  <!-- Slanted navy gap connecting bar -->
  <polygon points="220,0 255,0 240,16 205,16" fill="#063b64" />
  
  <!-- Horizontal Navy Band across top center -->
  <polygon points="265,0 560,0 540,12 250,12" fill="#042a48" />
  
  <!-- Top Right Main Geometric Block -->
  <!-- Dark navy background triangle/polygon -->
  <polygon points="545,0 800,0 800,110 735,110 610,25" fill="#063b64" />
  
  <!-- Deep navy corner triangle -->
  <polygon points="695,0 800,0 800,85" fill="#03213a" />
  
  <!-- Halftone Dot Matrix in Top Right (white dots) -->
  <g fill="#ffffff" opacity="0.9">
    <circle cx="725" cy="16" r="2.2" />
    <circle cx="740" cy="16" r="2.2" />
    <circle cx="755" cy="16" r="2.2" />
    <circle cx="770" cy="16" r="2.2" />
    <circle cx="785" cy="16" r="2.2" />
    
    <circle cx="735" cy="28" r="2.2" />
    <circle cx="750" cy="28" r="2.2" />
    <circle cx="765" cy="28" r="2.2" />
    <circle cx="780" cy="28" r="2.2" />
    
    <circle cx="745" cy="40" r="2.2" />
    <circle cx="760" cy="40" r="2.2" />
    <circle cx="775" cy="40" r="2.2" />
    <circle cx="790" cy="40" r="2.2" />
    
    <circle cx="755" cy="52" r="2.2" />
    <circle cx="770" cy="52" r="2.2" />
    <circle cx="785" cy="52" r="2.2" />

    <circle cx="765" cy="64" r="2.2" />
    <circle cx="780" cy="64" r="2.2" />

    <circle cx="775" cy="76" r="2.2" />
  </g>
  
  <!-- Vibrant Yellow Diagonal Accent Stripe (45 deg) -->
  <polygon points="590,0 606,0 710,105 694,105" fill="#f59e0b" />
</svg>
`;
}

/**
 * Geometric Modern Footer SVG (Gambar 2 Footer)
 * Features:
 * - Bottom-left sharp geometric navy block with golden yellow 45-deg diagonal stripe
 * - White halftone dot matrix pattern in bottom left corner
 * - Dark navy bottom horizontal band
 * - Bottom-right bright yellow accent bar
 */
export function getGeometricFooterSvg(width = 800, height = 110): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 110" width="100%" height="${height}" preserveAspectRatio="none" style="display: block; width: 100%;">
  <!-- Bottom Left Main Geometric Navy Block -->
  <polygon points="0,0 110,110 0,110" fill="#03213a" />
  <polygon points="0,18 135,110 0,110" fill="#063b64" />
  
  <!-- Halftone Dot Matrix in Bottom Left (white dots) -->
  <g fill="#ffffff" opacity="0.9">
    <circle cx="15" cy="75" r="2.2" />
    <circle cx="30" cy="75" r="2.2" />
    <circle cx="45" cy="75" r="2.2" />
    
    <circle cx="15" cy="88" r="2.2" />
    <circle cx="30" cy="88" r="2.2" />
    <circle cx="45" cy="88" r="2.2" />
    <circle cx="60" cy="88" r="2.2" />
    
    <circle cx="15" cy="100" r="2.2" />
    <circle cx="30" cy="100" r="2.2" />
    <circle cx="45" cy="100" r="2.2" />
    <circle cx="60" cy="100" r="2.2" />
    <circle cx="75" cy="100" r="2.2" />
  </g>
  
  <!-- Vibrant Yellow Diagonal Accent Stripe in Bottom Left (45 deg) -->
  <polygon points="68,8 165,105 149,105 52,8" fill="#f59e0b" />

  <!-- Bottom Horizontal Deep Navy Band -->
  <polygon points="160,94 540,94 518,110 140,110" fill="#063b64" />
  
  <!-- Bottom Right Yellow Accent Bar -->
  <polygon points="535,110 550,102 800,102 800,110" fill="#f59e0b" />
</svg>
`;
}

/**
 * Builds the Cover Page HTML matching Gambar 1 (cover.png)
 * Structured with:
 * - Upper 75% Teal-Blue Gradient with architectural background
 * - Top Left Brand: Jang Guru Super App
 * - JUDUL DOKUMEN (bold uppercase)
 * - Informasi Tambahan (subtitle / grade / subject)
 * - Nama Penulis & NIP
 * - Nama Sekolah
 * - Bottom 25% Navy Bar with Address & Year
 */
export function buildCoverPageHtml(options: ExportOptions, meta: DocMetadata): string {
  const brandText = options.coverBrandText || "Jang Guru Super App";
  const title = (options.coverTitle || meta.title || "MODUL AJAR DEEP LEARNING").toUpperCase();
  
  let subtitle = options.coverSubtitle || "";
  if (!subtitle) {
    const parts: string[] = [];
    if (meta.subject) parts.push(`Mata Pelajaran: ${meta.subject}`);
    if (meta.grade) parts.push(`Fase / Kelas: ${meta.grade}`);
    if (options.coverYear || meta.academicYear) parts.push(`Tahun Pelajaran: ${options.coverYear || meta.academicYear}`);
    if (meta.topic) parts.push(`Topik: ${meta.topic}`);
    subtitle = parts.length > 0 ? parts.join("\n") : "Perangkat Administrasi Kurikulum Merdeka";
  }
  
  const formattedSubtitle = subtitle.split('\n').join('<br/>');

  const authorName = options.coverAuthor || options.customTeacherName || meta.teacherName || "Guru Mata Pelajaran";
  const authorNip = options.coverNip || options.customTeacherNip || meta.teacherNip;
  const schoolName = (options.coverSchool || options.customSchoolName || meta.schoolName || "SMA NEGERI 1 INDONESIA").toUpperCase();
  const address = options.coverAddress || options.customSchoolAddress || (meta.schoolAddress ? `${meta.schoolAddress}${meta.schoolContact ? ' • ' + meta.schoolContact : ''}` : "Jl. Pendidikan Nasional No. 1 • Telp: (021) 123456 • info@sekolah.sch.id");
  const docYear = options.coverYear || meta.academicYear || "2024/2025";

  return `
  <div class="cover-page-wrapper" style="width: 100%; box-sizing: border-box; page-break-after: always; break-after: page; background-color: #034870; font-family: 'Segoe UI', Arial, sans-serif; min-height: 1050px; display: flex; flex-direction: column; position: relative; overflow: hidden; margin: 0; padding: 0;">
    
    <!-- UPPER SECTION (TEAL GRADIENT WITH ARCHITECTURAL ILLUSTRATION) -->
    <div style="flex: 1; min-height: 820px; background: linear-gradient(155deg, #0d9488 0%, #0284c7 45%, #0369a1 75%, #083344 100%); position: relative; padding: 48px 48px 40px 48px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- ARCHITECTURAL SILHOUETTE BACKGROUND -->
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 65%; pointer-events: none; z-index: 1; opacity: 0.22;">
        ${BUILDING_SILHOUETTE_SVG}
      </div>

      <!-- TOP BRAND HEADER -->
      <div style="position: relative; z-index: 2; display: flex; align-items: center; gap: 12px;">
        <div style="display: inline-block;">
          ${JANG_GURU_LOGO_SVG}
        </div>
        <span style="color: #ffffff; font-size: 16pt; font-weight: 700; letter-spacing: -0.2px; text-shadow: 0 1px 3px rgba(0,0,0,0.25);">
          ${brandText}
        </span>
      </div>

      <!-- MAIN TITLE & SUBTITLE -->
      <div style="position: relative; z-index: 2; margin-top: 50px; margin-bottom: 60px; text-align: left;">
        <h1 style="color: #ffffff; font-size: 30pt; font-weight: 900; line-height: 1.25; margin: 0 0 18px 0; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 2px 6px rgba(0,0,0,0.35); overflow-wrap: break-word; word-wrap: break-word;">
          ${title}
        </h1>
        <div style="color: #e0f2fe; font-size: 13.5pt; font-weight: 400; line-height: 1.5; text-shadow: 0 1px 3px rgba(0,0,0,0.25); max-width: 95%; overflow-wrap: break-word; word-wrap: break-word;">
          ${formattedSubtitle}
        </div>
      </div>

      <!-- AUTHOR, NIP & SCHOOL -->
      <div style="position: relative; z-index: 2; margin-top: auto; padding-bottom: 15px;">
        <div style="color: #ffffff; font-size: 15pt; font-weight: 800; line-height: 1.3; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
          ${authorName}
        </div>
        ${authorNip ? `
        <div style="color: #f0fdf4; font-size: 11.5pt; font-weight: 500; margin-top: 3px; opacity: 0.95;">
          NIP. ${authorNip}
        </div>
        ` : ''}

        <div style="margin-top: 28px; color: #ffffff; font-size: 22pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.35);">
          ${schoolName}
        </div>
      </div>

    </div>

    <!-- BOTTOM NAVY BAR (Gambar 1 Navy Footer Section) -->
    <div style="background-color: #072a4a; padding: 28px 48px; box-sizing: border-box; display: flex; justify-content: space-between; align-items: flex-end; border-top: 3px solid #38bdf8; position: relative; z-index: 3;">
      <!-- Left: School Address & Contact -->
      <div style="color: #f8fafc; font-size: 10.5pt; line-height: 1.55; max-width: 60%; opacity: 0.95;">
        ${address.split('\n').join('<br/>')}
      </div>

      <!-- Right: Document Year -->
      <div style="text-align: right;">
        <div style="color: #94a3b8; font-size: 9.5pt; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px;">
          TAHUN PELAJARAN
        </div>
        <div style="color: #ffffff; font-size: 20pt; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1;">
          ${docYear}
        </div>
      </div>
    </div>

  </div>
  `;
}
