import type { Metadata } from 'next';
import { CampaignForm } from '../../campaign-form';

export const metadata: Metadata = { title: 'Edit campaign' };

export default async function EditCampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CampaignForm slug={slug} />;
}
