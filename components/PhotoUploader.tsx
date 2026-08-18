'use client';

/**
 * PhotoUploader — single photo slot.
 *
 * Empty slot: shows a click/drag-drop upload area.
 * Filled slot: shows image preview with Replace + Remove buttons.
 *
 * Upload flow:
 *   1. User picks / drops a file.
 *   2. Component calls POST /api/upload to get a signed Cloudinary signature.
 *   3. Component POSTs file directly to Cloudinary (no proxy through Next.js).
 *   4. On success, calls onChange(secure_url).
 */

import { useRef, useState } from 'react';

interface Props {
  /** Current photo URL — empty string means empty slot. */
  value: string;
  onChange: (url: string) => void;
  /** Cloudinary folder, e.g. "ibuynaija/listings" */
  folder?: string;
  /** Max file size in MB (default 2). */
  maxMB?: number;
}

export default function PhotoUploader({
  value,
  onChange,
  folder = 'ibuynaija/listings',
  maxMB = 2,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [dragOver,     setDragOver]     = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WebP…)');
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setUploadError(`Image must be under ${maxMB} MB`);
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      // Step 1 — get signing params from server
      const sigRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
      if (!sigRes.ok) {
        const d = await sigRes.json().catch(() => ({}));
        throw new Error(d.error ?? 'Could not start upload');
      }
      const { signature, timestamp, api_key, cloud_name, folder: uploadFolder } = await sigRes.json();

      // Step 2 — upload directly to Cloudinary
      const form = new FormData();
      form.append('file',      file);
      form.append('api_key',   api_key);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder',    uploadFolder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        { method: 'POST', body: form },
      );
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        throw new Error(d.error?.message ?? 'Upload failed');
      }

      const result = await uploadRes.json();
      onChange(result.secure_url as string);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // allow re-selecting the same file
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const hasImage = !!value;

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden' }}>
      {hasImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Listing photo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Replace */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              position: 'absolute', bottom: 6, left: 6,
              background: 'rgba(27,42,74,0.78)', color: '#F7F1E3',
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600,
              border: 'none', borderRadius: 4, padding: '4px 8px',
              cursor: uploading ? 'default' : 'pointer',
            }}
          >
            {uploading ? 'Uploading…' : 'Replace'}
          </button>
          {/* Remove */}
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={uploading}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(27,42,74,0.75)', color: '#F7F1E3',
              border: 'none', borderRadius: 4, width: 22, height: 22,
              cursor: 'pointer', fontSize: 13, lineHeight: '22px', textAlign: 'center',
            }}
          >
            ✕
          </button>
        </>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
            border: `2px dashed ${uploadError ? 'rgba(193,84,44,0.5)' : dragOver ? 'rgba(27,42,74,0.55)' : 'rgba(27,42,74,0.2)'}`,
            borderRadius: 8,
            background: dragOver ? 'rgba(27,42,74,0.05)' : uploading ? 'rgba(27,42,74,0.03)' : '#fff',
            cursor: uploading ? 'default' : 'pointer',
            padding: 8,
            transition: 'border-color 0.12s, background 0.12s',
          }}
        >
          {uploading ? (
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
              Uploading…
            </span>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                  stroke="rgba(27,42,74,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{
                fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11,
                color: '#8A7E66', textAlign: 'center', lineHeight: 1.4,
              }}>
                Click or drag<br />image here
              </span>
            </>
          )}
          {uploadError && (
            <span style={{
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 10,
              color: '#C1542C', textAlign: 'center', lineHeight: 1.4,
            }}>
              {uploadError}
            </span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
    </div>
  );
}
