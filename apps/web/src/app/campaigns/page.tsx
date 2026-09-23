import type { Metadata } from 'next';
import { CampaignsExplorer } from './campaigns-explorer';

export const metadata: Metadata = { title: 'Campaigns' };

export default function CampaignsPage() {
  return <CampaignsExplorer />;
}
