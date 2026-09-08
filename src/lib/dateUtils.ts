export const INDONESIAN_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * Returns YYYY-MM-DD string using local calendar date (avoids UTC timezone shift of toISOString())
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns day name in Indonesian (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)
 */
export const getIndonesianDayName = (dateStr: string): string => {
  if (!dateStr) return "Senin";
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return INDONESIAN_DAYS[d.getDay()] || "Senin";
  }
  return "Senin";
};

/**
 * Formats YYYY-MM-DD to "D MMMM YYYY" in Indonesian, e.g. "2 September 2026"
 */
export const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const day = parts[2];
    const month = INDONESIAN_MONTHS[parts[1] - 1] || "";
    const year = parts[0];
    return `${day} ${month} ${year}`;
  }
  return dateStr;
};
