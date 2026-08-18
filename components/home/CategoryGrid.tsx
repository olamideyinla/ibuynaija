import Link from 'next/link';

const CATEGORIES = [
  { name: 'Fashion & Textiles',       slug: 'fashion-textiles',           emoji: '🧵', gradient: 'linear-gradient(135deg,#C1542C,#8A3018)' },
  { name: 'Beauty & Personal Care',   slug: 'beauty-personal-care',       emoji: '✨', gradient: 'linear-gradient(135deg,#1B2A4A,#2C426B)' },
  { name: 'Hair & Extensions',        slug: 'hair-wigs-weaves',           emoji: '💇', gradient: 'linear-gradient(135deg,#7A5A1E,#D9A02D)' },
  { name: 'Furniture & Décor',        slug: 'furniture-interior-decor',   emoji: '🪑', gradient: 'linear-gradient(135deg,#4A4334,#8A7E66)' },
  { name: 'Food & Spices',            slug: 'food-spices-pantry',         emoji: '🌶️', gradient: 'linear-gradient(135deg,#1B8A5B,#0D4A32)' },
  { name: 'Arts & Crafts',            slug: 'arts-crafts-home-decor',     emoji: '🎨', gradient: 'linear-gradient(135deg,#2A3340,#1B2A4A)' },
  { name: 'Jewelry',                  slug: 'jewelry-accessories',        emoji: '💍', gradient: 'linear-gradient(135deg,#7A5A1E,#C1542C)' },
  { name: 'Agro-Products',            slug: 'agro-products',              emoji: '🌾', gradient: 'linear-gradient(135deg,#4A6B1E,#7A9C40)' },
  { name: 'Creative & Media',         slug: 'creative-media',             emoji: '🎬', gradient: 'linear-gradient(135deg,#1B2A4A,#C1542C)' },
  { name: 'Cultural Heritage',        slug: 'cultural-heritage-souvenirs',emoji: '🏺', gradient: 'linear-gradient(135deg,#C1542C,#D9A02D)' },
  { name: 'Health & Herbs',           slug: 'health-wellness-herbs',      emoji: '🌿', gradient: 'linear-gradient(135deg,#1B6B3A,#2E9C5B)' },
  { name: 'Bags & Leather Goods',     slug: 'bags-leather-goods',         emoji: '👜', gradient: 'linear-gradient(135deg,#4A3018,#8A5A30)' },
  { name: 'Kids & Baby',              slug: 'kids-baby',                  emoji: '🧸', gradient: 'linear-gradient(135deg,#1B2A4A,#2A6B8A)' },
];

export default function CategoryGrid() {
  return (
    <section style={{ padding: '40px 24px 32px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}>
        {CATEGORIES.map((cat) => (
          <Link key={cat.slug} href={`/${cat.slug}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: cat.gradient, borderRadius: 12,
              padding: '20px 16px', aspectRatio: '1.5/1',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(27,42,74,0.15)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              cursor: 'pointer',
            }}>
              {/* Emoji watermark */}
              <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 28, opacity: 0.35 }}>
                {cat.emoji}
              </div>
              <span style={{
                fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
                color: '#F7F1E3', lineHeight: 1.2,
              }}>
                {cat.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
