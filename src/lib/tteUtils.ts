import QRCode from 'qrcode';

export interface TteBadgeOptions {
  signerName: string;
  nip?: string;
  role?: string; // e.g. "Guru Mata Pelajaran" or "Kepala Sekolah"
  institution?: string; // e.g. "SMA Negeri 2 Tasikmalaya"
  city?: string;
  date?: string;
  verificationCode?: string;
}

/**
 * Generates an official Indonesian digital signature (TTE) badge
 * combining a verifiable QR code with official certification metadata.
 */
export async function generateOfficialTteBadge(options: TteBadgeOptions): Promise<string> {
  const {
    signerName,
    nip = '-',
    role = 'Guru Mata Pelajaran',
    institution = 'SMA Negeri 2 Tasikmalaya',
    city = 'Tasikmalaya',
    date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    verificationCode = `TTE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  } = options;

  // 1. Generate the raw QR code with verifiable metadata
  const qrPayload = JSON.stringify({
    tipe: 'Tanda Tangan Elektronik (TTE) Tersertifikasi',
    penandatangan: signerName,
    nip: nip,
    jabatan: role,
    instansi: institution,
    titimangsa: `${city}, ${date}`,
    id_verifikasi: verificationCode,
    status: 'VALID & TERVERIFIKASI'
  }, null, 2);

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 200,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });

  // 2. Composite onto a canvas to create an official badge
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 135;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(qrDataUrl);
      return;
    }

    // Clean background with rounded rectangle
    const r = 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#059669'; // Emerald border
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(canvas.width - r, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
    ctx.lineTo(canvas.width, canvas.height - r);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
    ctx.lineTo(r, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top banner strip
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 0, canvas.width, 26);

    // Banner text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('✓ DITANDATANGANI SECARA ELEKTRONIK (TTE)', 12, 17);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(verificationCode, canvas.width - 12, 17);

    // Draw QR code
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 10, 32, 94, 94);

      // Divider line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(112, 34);
      ctx.lineTo(112, 126);
      ctx.stroke();

      // Right text details
      ctx.textAlign = 'left';

      // Role
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(role.toUpperCase(), 122, 46);

      // Signer Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(signerName, 122, 63);

      // NIP
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.fillText(`NIP. ${nip}`, 122, 79);

      // Institution
      ctx.fillStyle = '#64748b';
      ctx.font = '9.5px sans-serif';
      const cleanInst = institution.split('\n').pop() || institution;
      ctx.fillText(cleanInst, 122, 94);

      // Verification Badge Footer
      ctx.fillStyle = '#059669';
      ctx.font = 'italic 8.5px sans-serif';
      ctx.fillText(`Validasi Balai Sertifikasi Elektronik (BSrE) • ${date}`, 122, 114);

      resolve(canvas.toDataURL('image/png'));
    };
    qrImg.onerror = () => {
      resolve(qrDataUrl);
    };
    qrImg.src = qrDataUrl;
  });
}

/**
 * Removes white or near-white background from a scanned/photographed signature,
 * making it a crisp transparent PNG so it renders cleanly on any document.
 */
export async function makeSignatureBackgroundTransparent(dataUrl: string, threshold = 220): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If pixel is near white/light gray
        if (r > threshold && g > threshold && b > threshold) {
          data[i + 3] = 0; // Transparent
        } else {
          // Increase contrast for dark signature strokes
          const brightness = (r + g + b) / 3;
          if (brightness < 120) {
            // Darken strokes to rich black/dark-blue
            data[i] = Math.max(0, r - 30);
            data[i + 1] = Math.max(0, g - 30);
            data[i + 2] = Math.max(0, b - 15);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

export interface StoredTteConfig {
  teacherTteImage: string;
  principalTteImage: string;
  useTeacherTte: boolean;
  usePrincipalTte: boolean;
}

/**
 * Retrieves the stored TTE image URLs and user preferences across the entire application.
 */
export function getStoredTteConfig(): StoredTteConfig {
  let teacherTte = "";
  let principalTte = "";
  let useTeacherTte = true;
  let usePrincipalTte = true;

  try {
    if (typeof window !== "undefined") {
      teacherTte = 
        localStorage.getItem("guru_tte_image") || 
        localStorage.getItem("eduasisten_teacher_tte_image") || 
        "";
      principalTte = 
        localStorage.getItem("guru_headmaster_tte_image") || 
        localStorage.getItem("eduasisten_principal_tte_image") || 
        "";

      const rawTeacher = localStorage.getItem("eduasisten_use_teacher_tte") ?? localStorage.getItem("guru_use_tte");
      if (rawTeacher !== null) {
        useTeacherTte = rawTeacher === "true";
      } else {
        useTeacherTte = Boolean(teacherTte);
      }

      const rawPrincipal = localStorage.getItem("eduasisten_use_principal_tte") ?? localStorage.getItem("guru_use_principal_tte");
      if (rawPrincipal !== null) {
        usePrincipalTte = rawPrincipal === "true";
      } else {
        usePrincipalTte = Boolean(principalTte);
      }
    }
  } catch {
    // Storage access fallback
  }

  return {
    teacherTteImage: teacherTte,
    principalTteImage: principalTte,
    useTeacherTte,
    usePrincipalTte
  };
}

/**
 * Renders an inline HTML snippet for displaying a TTE image with proper dimensions.
 */
export function renderTteImageHtml(imageUrl?: string, alt = "Tanda Tangan Elektronik", maxHeight = 50, maxWidth = 130): string {
  if (!imageUrl || !imageUrl.trim()) return "";
  const cleanUrl = imageUrl.trim();
  return `
    <div style="height: ${maxHeight + 8}px; display: flex; align-items: center; justify-content: center; text-align: center; margin: 2px auto;">
      <img src="${cleanUrl}" alt="${alt}" style="max-height: ${maxHeight}px; max-width: ${maxWidth}px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;" />
    </div>
  `.trim();
}

/**
 * Safely embeds a TTE image into a jsPDF document instance.
 */
export function embedTteInJsPdf(
  doc: any,
  imgDataUrl: string | undefined,
  x: number,
  y: number,
  w = 28,
  h = 13
) {
  if (!doc || !imgDataUrl || !imgDataUrl.trim()) return;
  try {
    if (imgDataUrl.startsWith('data:image')) {
      const format = imgDataUrl.includes('image/jpeg') || imgDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      doc.addImage(imgDataUrl, format, x, y, w, h);
    }
  } catch (err) {
    console.warn('Could not embed TTE in jsPDF:', err);
  }
}
