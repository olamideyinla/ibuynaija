import { ImageResponse } from 'next/og';

export const size        = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#1B2A4A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer gold ring */}
        <div
          style={{
            position: 'absolute',
            width: 148,
            height: 148,
            borderRadius: 74,
            border: '4px solid #D9A02D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner gold ring */}
          <div
            style={{
              position: 'absolute',
              width: 118,
              height: 118,
              borderRadius: 59,
              border: '1.5px solid #D9A02D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span
                style={{
                  color: '#D9A02D',
                  fontSize: 13,
                  fontFamily: 'sans-serif',
                  letterSpacing: 4,
                }}
              >
                ★
              </span>
              <span
                style={{
                  color: '#D9A02D',
                  fontSize: 52,
                  fontWeight: 800,
                  fontFamily: 'sans-serif',
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                iB
              </span>
              <span
                style={{
                  color: '#D9A02D',
                  fontSize: 11,
                  fontFamily: 'sans-serif',
                  letterSpacing: 3,
                  fontWeight: 600,
                }}
              >
                NAIJA
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
