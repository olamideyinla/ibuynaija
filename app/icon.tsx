import { ImageResponse } from 'next/og';

export const size        = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#1B2A4A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Gold ring */}
        <div
          style={{
            position: 'absolute',
            width: 26,
            height: 26,
            borderRadius: 13,
            border: '1.5px solid #D9A02D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: '#D9A02D',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: 'sans-serif',
              letterSpacing: '-0.3px',
              lineHeight: 1,
            }}
          >
            iB
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
