import ProductCard from './ProductCard';
import type { ListingRow } from '@/lib/queries';

interface ProductGridProps {
  listings: ListingRow[];
  emptyMessage?: string;
}

export default function ProductGrid({ listings, emptyMessage = 'No listings found.' }: ProductGridProps) {
  if (!listings.length) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', color: '#8A7E66' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🛍️</div>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 16,
    }}>
      {listings.map((listing) => (
        <ProductCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
