import { safeStorage } from "./safeStorage";

export interface KopManualData {
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  line5: string;
}

export interface KopConfig {
  useKop: boolean;
  kopType: "manual" | "image";
  kopManual: KopManualData;
  kopImage: string;
  kopLogo: string;
  kopLogoPosition: "left" | "right" | "both" | "none";
  kopLogoSize: number;
  institution: string;
  schoolNpsn: string;
  academicYear: string;
  documentCity: string;
  subject: string;
  teacherName: string;
  nip: string;
  headmasterName: string;
  headmasterNip: string;
  headmasterRank: string;
}

/**
 * Retrieves full Kop Surat and Profile configuration from safeStorage
 */
export function getStoredKopConfig(): KopConfig {
  const institution = safeStorage.getItem("guru_institution") || "SMA NEGERI 2 TASIKMALAYA";
  const schoolNpsn = safeStorage.getItem("guru_school_npsn") || "20224510";
  const academicYear = safeStorage.getItem("guru_academic_year") || "2026/2027 (Semester Genap)";
  const documentCity = safeStorage.getItem("guru_doc_city") || "Tasikmalaya";
  const subject = safeStorage.getItem("guru_subject") || "EKONOMI";
  const teacherName = safeStorage.getItem("guru_name") || "Yudi Ginanjar, S.Pd.";
  const nip = safeStorage.getItem("guru_nip") || "198503152010011012";
  const headmasterName = safeStorage.getItem("guru_headmaster_name") || "Dr. Hj. Yanti Suryanti, M.Pd.";
  const headmasterNip = safeStorage.getItem("guru_headmaster_nip") || "197005121995122001";
  const headmasterRank = safeStorage.getItem("guru_headmaster_rank") || "Pembina Utama Muda, IV/c";

  const savedUseKop = safeStorage.getItem("guru_kop_enabled");
  const useKop = savedUseKop === null ? true : savedUseKop === "true";

  const savedKopType = safeStorage.getItem("guru_kop_type");
  const kopType = (savedKopType === "manual" || savedKopType === "image") ? savedKopType : "manual";

  let kopManual: KopManualData = {
    line1: "PEMERINTAH PROVINSI JAWA BARAT",
    line2: "DINAS PENDIDIKAN",
    line3: institution || "SMA NEGERI 2 TASIKMALAYA",
    line4: "Jl. Ir. H. Juanda No. 93, Coblong, Kota Bandung | Telp: (022) 250123",
    line5: "Website: www.sman2tasikmalaya.sch.id | Email: info@sman2tasikmalaya.sch.id"
  };

  const savedKopManualStr = safeStorage.getItem("guru_kop_manual");
  if (savedKopManualStr) {
    try {
      const parsed = JSON.parse(savedKopManualStr);
      kopManual = {
        line1: parsed.line1 || kopManual.line1,
        line2: parsed.line2 || kopManual.line2,
        line3: parsed.line3 || institution || kopManual.line3,
        line4: parsed.line4 || kopManual.line4,
        line5: parsed.line5 || kopManual.line5
      };
    } catch (e) {
      console.error("Failed to parse stored kop manual:", e);
    }
  }

  const kopImage = safeStorage.getItem("guru_kop_image") || "";
  const kopLogo = safeStorage.getItem("guru_kop_logo") || "";
  const kopLogoPosition = (safeStorage.getItem("guru_kop_logo_position") as any) || "left";
  const savedLogoSize = safeStorage.getItem("guru_kop_logo_size");
  const kopLogoSize = savedLogoSize ? parseInt(savedLogoSize, 10) : 55;

  return {
    useKop,
    kopType,
    kopManual,
    kopImage,
    kopLogo,
    kopLogoPosition,
    kopLogoSize,
    institution,
    schoolNpsn,
    academicYear,
    documentCity,
    subject,
    teacherName,
    nip,
    headmasterName,
    headmasterNip,
    headmasterRank
  };
}

export interface RenderKopHeaderOptions {
  documentTitle?: string;
  subtitle?: string;
  customConfig?: Partial<KopConfig>;
  showDocumentTitleInHeader?: boolean;
}

/**
 * Generates an official Kop Surat HTML block integrated with teacher profile
 */
export function renderKopHeaderHtml(options: RenderKopHeaderOptions = {}): string {
  const stored = getStoredKopConfig();
  const config: KopConfig = { ...stored, ...(options.customConfig || {}) };

  const {
    useKop,
    kopType,
    kopManual,
    kopImage,
    kopLogo,
    kopLogoPosition,
    kopLogoSize,
    institution,
    schoolNpsn,
    academicYear,
    subject
  } = config;

  const docTitle = options.documentTitle;
  const docSubtitle = options.subtitle || (
    subject 
      ? `Mata Pelajaran: <strong>${subject}</strong> • NPSN: ${schoolNpsn || "-"} • Tahun Ajaran: ${academicYear || "-"}`
      : `NPSN: ${schoolNpsn || "-"} • Tahun Ajaran: ${academicYear || "-"}`
  );

  // If Kop is disabled or simple mode is chosen, render clean profile-integrated single/double header
  if (!useKop) {
    return `
      <div class="kop-container" style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">${(institution || "SMA NEGERI 2 TASIKMALAYA").replace(/\n/g, '<br>')}</h2>
      </div>
      ${docTitle ? `
        <div class="document-title-block" style="text-align: center; margin-bottom: 18px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">${docTitle}</h3>
          ${docSubtitle ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #475569; font-weight: 500;">${docSubtitle}</p>` : ''}
        </div>
      ` : ''}
    `;
  }

  // If Kop is an uploaded custom banner image
  if (kopType === "image" && kopImage) {
    return `
      <div class="kop-container" style="border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 16px; text-align: center;">
        <img src="${kopImage}" alt="Kop Surat Resmi" style="max-height: 95px; max-width: 100%; object-fit: contain;" referrerPolicy="no-referrer" />
      </div>
      ${docTitle ? `
        <div class="document-title-block" style="text-align: center; margin-bottom: 18px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">${docTitle}</h3>
          ${docSubtitle ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #475569; font-weight: 500;">${docSubtitle}</p>` : ''}
        </div>
      ` : ''}
    `;
  }

  // Official Manual Text Kop Surat with School Logo(s) and 5 header lines
  const schoolNameLine = kopManual.line3 || institution || "SMA NEGERI 2 TASIKMALAYA";

  return `
    <div class="kop-container" style="border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; min-height: 75px;">
        <!-- Left Logo Column -->
        <div style="width: 75px; text-align: left; display: ${kopLogo && (kopLogoPosition === 'left' || kopLogoPosition === 'both') ? 'block' : 'none'};">
          <img src="${kopLogo}" alt="Logo Sekolah" style="max-height: ${kopLogoSize}px; max-width: 100%; object-fit: contain;" referrerPolicy="no-referrer" />
        </div>
        
        <!-- Symmetric spacer if only right logo is active -->
        <div style="width: 75px; display: ${kopLogo && kopLogoPosition === 'right' ? 'block' : 'none'};"></div>

        <!-- Text Lines -->
        <div style="flex-grow: 1; text-align: center; line-height: 1.25; padding: 0 10px;">
          ${kopManual.line1 ? `<div style="font-size: 11px; font-weight: bold; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; color: #1e293b;">${kopManual.line1}</div>` : ''}
          ${kopManual.line2 ? `<div style="font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin: 2px 0 0 0; text-transform: uppercase; color: #1e293b;">${kopManual.line2}</div>` : ''}
          <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px; margin: 3px 0 0 0; color: #0f172a; text-transform: uppercase;">${schoolNameLine}</div>
          ${kopManual.line4 ? `<div style="font-size: 8.5px; color: #475569; margin: 4px 0 0 0; font-weight: 500;">${kopManual.line4}</div>` : ''}
          ${kopManual.line5 ? `<div style="font-size: 8.5px; color: #475569; margin: 1px 0 0 0; font-style: italic; font-weight: 500;">${kopManual.line5}</div>` : ''}
        </div>

        <!-- Right Logo Column -->
        <div style="width: 75px; text-align: right; display: ${kopLogo && (kopLogoPosition === 'right' || kopLogoPosition === 'both') ? 'block' : 'none'};">
          <img src="${kopLogo}" alt="Logo Sekolah" style="max-height: ${kopLogoSize}px; max-width: 100%; object-fit: contain;" referrerPolicy="no-referrer" />
        </div>
        
        <!-- Symmetric spacer if only left logo is active -->
        <div style="width: 75px; display: ${kopLogo && kopLogoPosition === 'left' ? 'block' : 'none'};"></div>
      </div>
    </div>

    ${docTitle ? `
      <div class="document-title-block" style="text-align: center; margin-bottom: 18px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">${docTitle}</h3>
        ${docSubtitle ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #475569; font-weight: 500;">${docSubtitle}</p>` : ''}
      </div>
    ` : ''}
  `;
}
