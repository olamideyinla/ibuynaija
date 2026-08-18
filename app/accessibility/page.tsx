import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility | iBuyNaija',
  description: 'Our commitment to making iBuyNaija accessible to everyone in Nigeria and beyond.',
};

const PROSE: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 15,
  color: '#3A3025',
  lineHeight: 1.8,
};

const H2: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 20,
  color: '#1B2A4A',
  margin: '40px 0 12px',
};

const H3: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: '#1B2A4A',
  margin: '24px 0 8px',
};

function StatusBadge({ label, variant }: { label: string; variant: 'good' | 'partial' | 'planned' }) {
  const colors = {
    good:    { bg: 'rgba(46,125,50,0.1)', color: '#2E7D32' },
    partial: { bg: 'rgba(217,160,45,0.15)', color: '#9B6F00' },
    planned: { bg: 'rgba(27,42,74,0.08)', color: '#8A7E66' },
  };
  const c = colors[variant];
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg, color: c.color,
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
      padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
      marginLeft: 8, verticalAlign: 'middle',
    }}>
      {label}
    </span>
  );
}

export default function AccessibilityPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Accessibility</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, color: '#1B2A4A', margin: '0 0 12px' }}>
            Accessibility Statement
          </h1>
          <p style={{ ...PROSE, color: '#8A7E66' }}>
            Last updated: July 2026
          </p>
        </div>

        <p style={PROSE}>
          iBuyNaija is committed to ensuring that our marketplace is accessible to all users in Nigeria and beyond — including people with visual, auditory, motor, or cognitive disabilities. We believe that buying and selling Made-in-Nigeria products and services should be possible for everyone.
        </p>

        <h2 style={H2}>Our Conformance Goal</h2>
        <p style={PROSE}>
          We aim to meet the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> standard. This is the widely accepted benchmark for digital accessibility and is referenced by the Nigerian government&rsquo;s digital service standards.
        </p>
        <p style={PROSE}>
          We are in active development and our accessibility work is ongoing. The status of key areas is described below.
        </p>

        <h2 style={H2}>Current Accessibility Features</h2>

        <h3 style={H3}>Colour and contrast <StatusBadge label="Implemented" variant="good" /></h3>
        <p style={PROSE}>
          Our colour palette — navy (#1B2A4A), warm cream (#F7F1E3), burnt orange (#C1542C), and gold (#D9A02D) — is chosen to maintain strong contrast ratios. Body text on light backgrounds exceeds the WCAG AA minimum contrast ratio of 4.5:1. Interactive elements such as buttons and links are visually distinguishable without relying solely on colour.
        </p>

        <h3 style={H3}>Text sizing and responsive layout <StatusBadge label="Implemented" variant="good" /></h3>
        <p style={PROSE}>
          Font sizes use relative units and fluid typography where appropriate, allowing text to be resized via browser settings without breaking the layout. All pages are responsive and functional on screen widths from 320px upwards, covering the range of devices used across Nigeria — from low-cost Android phones to desktop computers.
        </p>

        <h3 style={H3}>Semantic HTML <StatusBadge label="Implemented" variant="good" /></h3>
        <p style={PROSE}>
          Pages use semantic HTML elements — <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;section&gt;</code>, <code>&lt;footer&gt;</code>, <code>&lt;h1&gt;</code>–<code>&lt;h3&gt;</code> — to provide structure that assistive technologies (screen readers) can navigate. Forms use <code>&lt;label&gt;</code> elements correctly associated with their inputs.
        </p>

        <h3 style={H3}>Keyboard navigation <StatusBadge label="Partial" variant="partial" /></h3>
        <p style={PROSE}>
          Core navigation — the menu, search bar, product listings, and primary buttons — is accessible via keyboard (Tab, Enter, Escape). Some interactive components, including multi-photo uploaders and certain modal confirmations, have limited keyboard focus management. We are actively improving these areas.
        </p>

        <h3 style={H3}>Screen reader support <StatusBadge label="Partial" variant="partial" /></h3>
        <p style={PROSE}>
          We test with NVDA (Windows) and VoiceOver (iOS/macOS). The main buying and browsing flows — search, category pages, listing detail, and checkout — are operable with a screen reader. Dynamic content updates (such as filtering search results) do not yet announce changes to screen readers via ARIA live regions. We are planning to address this.
        </p>

        <h3 style={H3}>Images <StatusBadge label="Partial" variant="partial" /></h3>
        <p style={PROSE}>
          Product and service images are displayed with <code>alt</code> text derived from the listing title. Decorative images and icons use empty <code>alt=""</code> to be skipped by screen readers. Seller-uploaded images do not yet have custom alt text — sellers cannot currently provide their own descriptions. This is on our improvement roadmap.
        </p>

        <h3 style={H3}>Focus indicators <StatusBadge label="Planned" variant="planned" /></h3>
        <p style={PROSE}>
          Default browser focus outlines are not consistently suppressed, meaning keyboard users can usually see focus. We are planning a dedicated, high-visibility focus indicator across all interactive elements as part of an upcoming design pass.
        </p>

        <h3 style={H3}>Motion and animation <StatusBadge label="Implemented" variant="good" /></h3>
        <p style={PROSE}>
          The platform does not use autoplay video, flashing content, or animations that could trigger photosensitive epilepsy. Hover transitions are subtle and brief (150ms). There are no parallax scroll effects.
        </p>

        <h3 style={H3}>Mobile and touch accessibility <StatusBadge label="Implemented" variant="good" /></h3>
        <p style={PROSE}>
          Interactive touch targets (buttons, links, chips) are sized to a minimum of 44×44 CSS pixels in line with WCAG 2.5.5. The mobile bottom navigation bar uses appropriately spaced touch targets. The site supports both portrait and landscape orientations without content being cut off.
        </p>

        <h2 style={H2}>Known Limitations</h2>
        <p style={PROSE}>We are aware of the following accessibility limitations and are actively working to address them:</p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li>The photo upload component does not announce file selection events to screen readers.</li>
          <li>The availability schedule grid on the service creation form is not fully keyboard-navigable.</li>
          <li>Error messages on form validation are not consistently announced by ARIA live regions.</li>
          <li>Some decorative SVG icons lack explicit <code>role="img"</code> attributes.</li>
          <li>Date and time inputs on the booking form rely on native browser controls that vary in accessibility across operating systems.</li>
        </ul>

        <h2 style={H2}>Feedback and Assistance</h2>
        <p style={PROSE}>
          We welcome feedback on the accessibility of iBuyNaija. If you encounter a barrier that prevents you from using any part of the Platform, please contact us and we will do our best to provide the information or functionality you need through an alternative means.
        </p>
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 12, padding: '20px 24px', marginTop: 20 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 4 }}>Contact for Accessibility</div>
          <p style={{ ...PROSE, fontSize: 14, margin: 0 }}>
            Email: <a href="mailto:accessibility@ibuynaija.com" style={{ color: '#C1542C' }}>accessibility@ibuynaija.com</a><br />
            We aim to respond to accessibility feedback within <strong>5 business days</strong>.
          </p>
        </div>

        <h2 style={H2}>Third-Party Content</h2>
        <p style={PROSE}>
          iBuyNaija uses Cloudinary for image hosting and delivery. The accessibility of Cloudinary&rsquo;s CDN infrastructure is governed by Cloudinary&rsquo;s own policies. Seller-uploaded content (photos, descriptions) is provided by third parties and may not meet all accessibility standards. We encourage sellers to write clear, descriptive product and service listings.
        </p>

        <h2 style={H2}>Review Schedule</h2>
        <p style={PROSE}>
          This Accessibility Statement is reviewed and updated at least every <strong>12 months</strong>, or whenever significant changes are made to the Platform. We plan to commission an independent accessibility audit in the next review cycle.
        </p>

      </main>
    </>
  );
}
