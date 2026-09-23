import type { Metadata } from 'next';
import { ForestQuestPanel } from './forestquest-panel';

export const metadata: Metadata = { title: 'ForestQuest' };

export default function ForestQuestPage() {
  return <ForestQuestPanel />;
}
