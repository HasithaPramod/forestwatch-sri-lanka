import type { Metadata } from 'next';
import { CampaignDetail } from './campaign-detail';

export const metadata: Metadata = { title: 'Campaign' };

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CampaignDetail slug={slug} />;
}
