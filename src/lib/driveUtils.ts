import { MaterialType } from "../types";

/**
 * Extracts Google Drive / Docs / Slides File ID from a standard URL or share link
 */
export function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern for /d/FILE_ID/
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchD && matchD[1]) return matchD[1];

  // Pattern for id=FILE_ID or export=view&id=FILE_ID
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (matchId && matchId[1]) return matchId[1];

  // Pattern for googleusercontent.com/d/FILE_ID
  const matchLh3 = trimmed.match(/googleusercontent\.com\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{20,})/);
  if (matchLh3 && matchLh3[1]) return matchLh3[1];

  // Standalone Google Drive file ID (alphanumeric string of 25-100 characters)
  if (/^[a-zA-Z0-9_-]{25,100}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Converts any Google Drive share link, Google Drive ID, or image URL
 * into a direct displayable image URL for <img> tags.
 */
export function formatDriveImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Return base64 / data URIs directly
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;

  const fileId = extractGoogleDriveId(trimmed);
  if (
    fileId &&
    (trimmed.includes("drive.google.com") ||
      trimmed.includes("docs.google.com") ||
      trimmed.includes("googleusercontent.com") ||
      !trimmed.startsWith("http"))
  ) {
    // Return high-performance CDN link for Google Drive images
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

/**
 * Extracts YouTube Video ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // youtube.com/watch?v=ID
  const matchWatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (matchWatch && matchWatch[1]) return matchWatch[1];

  // youtu.be/ID
  const matchShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (matchShort && matchShort[1]) return matchShort[1];

  // youtube.com/embed/ID
  const matchEmbed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (matchEmbed && matchEmbed[1]) return matchEmbed[1];

  return null;
}

/**
 * Converts any Google Drive / Docs / Slides / YouTube / Direct link into a clean Embed URL for iframe display
 */
export function convertToEmbedUrl(url: string, suggestedType?: MaterialType): { embedUrl: string; detectedType: MaterialType } {
  if (!url) return { embedUrl: "", detectedType: suggestedType || "link" };

  const trimmed = url.trim();

  // 1. YouTube Link
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`,
      detectedType: "video"
    };
  }

  // 2. Google Slides / Presentation
  if (trimmed.includes("docs.google.com/presentation")) {
    const fileId = extractGoogleDriveId(trimmed);
    if (fileId) {
      return {
        embedUrl: `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`,
        detectedType: "presentation"
      };
    }
  }

  // 3. Google Docs
  if (trimmed.includes("docs.google.com/document")) {
    const fileId = extractGoogleDriveId(trimmed);
    if (fileId) {
      return {
        embedUrl: `https://docs.google.com/document/d/${fileId}/preview`,
        detectedType: "document"
      };
    }
  }

  // 4. Google Sheets
  if (trimmed.includes("docs.google.com/spreadsheets")) {
    const fileId = extractGoogleDriveId(trimmed);
    if (fileId) {
      return {
        embedUrl: `https://docs.google.com/spreadsheets/d/${fileId}/preview`,
        detectedType: "document"
      };
    }
  }

  // 5. Google Drive File (PDF, Video, PPTX file upload on Drive)
  if (trimmed.includes("drive.google.com")) {
    const fileId = extractGoogleDriveId(trimmed);
    if (fileId) {
      // Determine if it's already an embed/preview link
      const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      return {
        embedUrl: previewUrl,
        detectedType: suggestedType || (trimmed.toLowerCase().includes("video") ? "video" : "presentation")
      };
    }
  }

  // 6. Generic Embed or Web Page (e.g. Canva slides, Slideshare, direct MP4/PDF link)
  return {
    embedUrl: trimmed,
    detectedType: suggestedType || "link"
  };
}
