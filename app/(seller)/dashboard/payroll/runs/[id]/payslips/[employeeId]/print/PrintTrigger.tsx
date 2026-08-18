'use client';
import { useEffect } from 'react';

/** Opens the browser print dialog once on mount. */
export default function PrintTrigger() {
  useEffect(() => { window.print(); }, []);
  return null;
}
