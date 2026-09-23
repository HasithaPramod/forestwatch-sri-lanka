import type { Metadata } from 'next';
import { CampaignForm } from '../campaign-form';

export const metadata: Metadata = { title: 'New campaign' };

export default function NewCampaignPage() {
  return <CampaignForm />;
}
