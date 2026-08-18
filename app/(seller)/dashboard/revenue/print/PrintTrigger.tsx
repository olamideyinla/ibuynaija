'use client';
import { useEffect } from 'react';

/**
 * Calls window.print() once on mount so the browser print dialog
 * opens automatically when the print page loads.
 */
export default function PrintTrigger() {
  useEffect(() => {
    window.print();
  }, []);
  return null;
}
