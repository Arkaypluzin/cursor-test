/**
 * Converts a datetime-local input value to ISO string with timezone
 * @param datetimeLocal - Value from datetime-local input (e.g., "2026-01-21T11:15")
 * @returns ISO string or null if empty
 */
export function datetimeLocalToISO(datetimeLocal: string | null | undefined): string | null {
  if (!datetimeLocal || datetimeLocal.trim() === '') {
    return null;
  }
  
  // datetime-local format is "YYYY-MM-DDTHH:mm" (no timezone)
  // We need to create a Date object and convert to ISO
  const date = new Date(datetimeLocal);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date.toISOString();
}

/**
 * Converts an ISO string to datetime-local format for input fields
 * @param isoString - ISO string from database
 * @returns datetime-local format string or empty string
 */
export function isoToDatetimeLocal(isoString: string | null | undefined): string {
  if (!isoString) {
    return '';
  }
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Format as YYYY-MM-DDTHH:mm (datetime-local format)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}
