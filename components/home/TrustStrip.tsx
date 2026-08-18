export default function TrustStrip() {
  return (
    <div style={{ background: '#1B2A4A', color: '#F7F1E3', padding: '20px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: '🏦', title: 'Pay sellers directly', desc: 'Bank transfer between you and the seller — we never touch your money.' },
          { icon: '🇳🇬', title: 'Made in Nigeria', desc: 'Every product is self-declared Nigerian-made and reactively moderated.' },
          { icon: '✅', title: 'Verified sellers', desc: 'Admin-reviewed sellers get a badge and priority placement in search.' },
        ].map((item) => (
          <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: '1 1 240px', maxWidth: 320 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: 'rgba(247,241,227,0.72)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
