import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const step = request.nextUrl.searchParams.get('step') ?? '1';

  // Step 1: basic layout
  if (step === '1') {
    return new ImageResponse(
      <div style={{ width: 1080, height: 1080, background: '#1B2A4A', display: 'flex', flexDirection: 'row' }}>
        <div style={{ width: 540, height: 1080, background: '#2C426B', display: 'flex' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 48 }}>
          <div style={{ color: '#D9A02D', fontSize: 40, fontWeight: 700, display: 'flex' }}>iBuyNaija</div>
          <div style={{ color: '#F7F1E3', fontSize: 32, display: 'flex', marginTop: 16 }}>Test title</div>
        </div>
      </div>,
      { width: 1080, height: 1080 }
    );
  }

  // Step 2: add letterSpacing
  if (step === '2') {
    return new ImageResponse(
      <div style={{ width: 1080, height: 1080, background: '#1B2A4A', display: 'flex', flexDirection: 'column', padding: 48 }}>
        <div style={{ color: '#D9A02D', fontSize: 13, fontWeight: 700, letterSpacing: 2.5, display: 'flex' }}>FASHION</div>
        <div style={{ color: '#F7F1E3', fontSize: 34, fontWeight: 700, display: 'flex', marginTop: 16 }}>Test title here</div>
        <div style={{ color: '#D9A02D', fontSize: 52, fontWeight: 700, display: 'flex', marginTop: 16 }}>₦28,500</div>
      </div>,
      { width: 1080, height: 1080 }
    );
  }

  // Step 3: add NaijaSeal (no transform)
  if (step === '3') {
    return new ImageResponse(
      <div style={{ width: 1080, height: 1080, background: '#1B2A4A', display: 'flex', padding: 48 }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(247,241,227,0.9)',
          border: '3px solid #D9A02D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#D9A02D', fontSize: 11, fontWeight: 700, display: 'flex' }}>★</div>
            <div style={{ color: '#D9A02D', fontSize: 8, fontWeight: 600, display: 'flex' }}>MADE IN</div>
            <div style={{ color: '#D9A02D', fontSize: 18, fontWeight: 700, display: 'flex' }}>NAIJA</div>
          </div>
        </div>
      </div>,
      { width: 1080, height: 1080 }
    );
  }

  // Step 4: add transform on NaijaSeal
  if (step === '4') {
    return new ImageResponse(
      <div style={{ width: 1080, height: 1080, background: '#1B2A4A', display: 'flex', padding: 48 }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(247,241,227,0.9)',
          border: '3px solid #D9A02D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-11deg)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: '#D9A02D', fontSize: 11, fontWeight: 700, display: 'flex' }}>★</div>
            <div style={{ color: '#D9A02D', fontSize: 18, fontWeight: 700, display: 'flex' }}>NAIJA</div>
          </div>
        </div>
      </div>,
      { width: 1080, height: 1080 }
    );
  }

  // Step 5: img with objectFit
  if (step === '5') {
    return new ImageResponse(
      <div style={{ width: 1080, height: 1080, display: 'flex', background: '#1B2A4A' }}>
        <div style={{ width: 540, height: 1080, overflow: 'hidden', display: 'flex', position: 'relative' }}>
          <img
            src="https://images.unsplash.com/photo-1594489428504-5c0c480a15fd?w=600"
            width={540}
            height={1080}
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div style={{ flex: 1, background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#F7F1E3', fontSize: 32, display: 'flex' }}>Info panel</div>
        </div>
      </div>,
      { width: 1080, height: 1080 }
    );
  }

  return new Response('use ?step=1..5', { status: 400 });
}
