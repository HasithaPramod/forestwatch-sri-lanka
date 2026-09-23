'use client';

import type {
  CommentNode,
  InspectionSummary,
  MonitoringUpdateSummary,
  PlantationDetail as PlantationDetailType,
  ReportSummary,
  VerificationRecord,
} from '@forestwatch/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { formatHealth, formatSurvivalEstimate } from '@/lib/monitoring';
import { formatCoordinates, formatRecordedTrees } from '@/lib/plantations';
import { speciesPath } from '@/lib/species';
import { ImageUploadField } from '@/components/image-upload-field';
import { StoredImage } from '@/components/stored-image';
import { CommentsThread } from './comments-thread';
import { InspectionsSection } from './inspections-section';
import { MonitoringForm } from './monitoring-form';
import { MonitoringTimeline } from './monitoring-timeline';
import { PlantationMiniMap } from './plantation-mini-map';
import { ReportsSection } from './reports-section';
import { VerificationHistory } from './verification-history';

export function PlantationDetail({ id }: { id: string }) {
  const { client, ready } = useAuth();
  const [plantation, setPlantation] = useState<PlantationDetailType | null>(null);
  const [updates, setUpdates] = useState<MonitoringUpdateSummary[]>([]);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!ready) {
      return;
    }
    void Promise.all([
      client.getPlantation(id),
      client.listMonitoringUpdates(id),
      client.listComments(id),
      client.listPlantationReports(id),
      client.listVerifications({ subjectType: 'PLANTATION', subjectId: id }),
      client.listInspections(id),
    ])
      .then(([detail, page, commentPage, reportPage, verificationPage, inspectionPage]) => {
        setPlantation(detail);
        setUpdates(page.items);
        setComments(commentPage.items);
        setReports(reportPage.items);
        setVerifications(verificationPage.items);
        setInspections(inspectionPage.items);
        setError(null);
      })
      .catch((caught: unknown) => {
        setPlantation(null);
        setUpdates([]);
        setComments([]);
        setReports([]);
        setVerifications([]);
        setInspections([]);
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Plantation not found');
      });
  }, [client, id, ready]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/plantations" className="text-sm text-forest-800 underline">
        All plantations
      </Link>
      {!ready ? <p className="mt-8 text-ink/70">Loading plantation…</p> : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}
      {plantation ? (
        <>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-forest-700">{plantation.verificationStatus}</p>
          <h1 className="mt-2 font-display text-4xl text-forest-900">{plantation.name}</h1>
          {plantation.description ? <p className="mt-4 text-lg leading-8 text-ink/80">{plantation.description}</p> : null}
          <dl className="mt-8 grid gap-4 rounded-2xl border border-forest-900/10 bg-white/70 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink/60">Type</dt>
              <dd className="mt-1">{plantation.type === 'PLANTATION_SITE' ? 'Plantation site' : 'Individual tree'}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Planting date</dt>
              <dd className="mt-1">
                {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(
                  new Date(plantation.plantingDate),
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Recorded trees</dt>
              <dd className="mt-1">{formatRecordedTrees(plantation.treeCount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Area</dt>
              <dd className="mt-1">{plantation.areaHectares != null ? `${plantation.areaHectares} ha` : 'Not recorded'}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Campaign</dt>
              <dd className="mt-1">
                {plantation.campaign ? (
                  <Link href={`/campaigns/${plantation.campaign.slug}`} className="text-forest-800 underline">
                    {plantation.campaign.name}
                  </Link>
                ) : (
                  'None'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Organization</dt>
              <dd className="mt-1">{plantation.organization?.name ?? 'None'}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Administrative area</dt>
              <dd className="mt-1">
                {[plantation.provinceCode, plantation.districtCode, plantation.dsdCode, plantation.gndCode]
                  .filter(Boolean)
                  .join(' → ') || 'Not recorded'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Coordinates</dt>
              <dd className="mt-1">
                {formatCoordinates(
                  plantation.coordinates.latitude,
                  plantation.coordinates.longitude,
                  plantation.coordinates.precision,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Current health</dt>
              <dd className="mt-1">
                {plantation.currentHealth
                  ? `${formatHealth(plantation.currentHealth.healthStatus)} · ${new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(plantation.currentHealth.observedAt))}`
                  : 'No verified monitoring update yet'}
              </dd>
            </div>
          </dl>
          <PlantationMiniMap
            id={plantation.id}
            name={plantation.name}
            treeCount={plantation.treeCount}
            coordinates={plantation.coordinates}
          />
          <h2 className="mt-10 font-display text-2xl text-forest-900">Species</h2>
          <ul className="mt-4 divide-y divide-forest-900/10 rounded-2xl border border-forest-900/10 bg-white/70">
            {plantation.species.map((row) => (
              <li key={row.speciesId} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
                <Link href={speciesPath(row.scientificName)} className="text-forest-800 underline">
                  {row.commonEnglishName} <span className="italic text-ink/60">({row.scientificName})</span>
                </Link>
                <span>{row.quantity.toLocaleString('en-LK')}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-10 font-display text-2xl text-forest-900">Photographs</h2>
          {plantation.images.length === 0 ? (
            <p className="mt-4 text-sm text-ink/70">No photographs are stored for this record.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {plantation.images.map((image) => (
                <li key={image.id} className="space-y-2">
                  <StoredImage image={image} alt={`${plantation.name} photograph`} />
                  {plantation.editable ? (
                    <button
                      type="button"
                      className="text-sm text-forest-800 underline"
                      onClick={() => {
                        void client
                          .deletePlantationImage(plantation.id, image.id)
                          .then(setPlantation)
                          .catch((caught: unknown) => {
                            setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not delete photograph');
                          });
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {plantation.editable ? (
            <div className="mt-4">
              <ImageUploadField
                label="Add a photograph"
                current={null}
                emptyLabel=""
                onUpload={async (file) => {
                  const detail = await client.uploadPlantationImage(plantation.id, file, file.name);
                  setPlantation(detail);
                }}
              />
            </div>
          ) : null}
          <h2 className="mt-10 font-display text-2xl text-forest-900">Monitoring</h2>
          {plantation.currentHealth ? (
            <p className="mt-3 text-sm text-ink/70">
              {formatSurvivalEstimate(
                plantation.currentHealth.estimatedSurvivingTrees,
                plantation.currentHealth.estimatedDeadTrees,
              ) ?? 'Latest verified condition is shown above. Recorded tree count is unchanged.'}
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink/70">
              Monitoring history starts with verified field updates. This page does not invent survival figures.
            </p>
          )}
          <MonitoringTimeline items={updates} onChanged={load} />
          <h3 className="mt-10 font-display text-xl text-forest-900">Submit an update</h3>
          <MonitoringForm plantationId={plantation.id} onSubmitted={load} />
          <VerificationHistory
            plantationId={plantation.id}
            verificationStatus={plantation.verificationStatus}
            items={verifications}
            onChanged={load}
          />
          <InspectionsSection plantationId={plantation.id} items={inspections} onChanged={load} />
          <h2 className="mt-10 font-display text-2xl text-forest-900">Comments</h2>
          <CommentsThread plantationId={plantation.id} items={comments} onChanged={load} />
          <ReportsSection plantationId={plantation.id} items={reports} onChanged={load} />
          {plantation.editable ? (
            <Link
              href={`/plantations/${plantation.id}/edit`}
              className="mt-8 inline-block rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700"
            >
              Edit plantation
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
