import type { Metadata } from 'next';
import { SearchPanel } from './search-panel';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  return <SearchPanel />;
}
