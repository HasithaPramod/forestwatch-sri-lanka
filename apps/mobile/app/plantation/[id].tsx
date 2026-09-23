import type {
  InspectionSummary,
  MonitoringUpdateSummary,
  PlantationDetail as PlantationDetailType,
  ReportSummary,
  VerificationRecord,
} from '@forestwatch/types';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { InspectionsSection, MonitoringForm, MonitoringTimeline, PlantationOutbox, ReportForm, ReportList } from '@/components/field-forms';
import { StoredPhoto } from '@/components/StoredPhoto';
import { Button, ErrorText, Field, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';
import {
  formatCoordinates,
  formatDate,
  formatHealth,
  formatRecordedTrees,
  formatSurvivalEstimate,
  formatVerificationDecision,
} from '@/lib/format';
import { canVerifyRecords } from '@/lib/permissions';
import { cachePlantationDetail, getCachedPlantationDetail } from '@/lib/offline-store';

export default function PlantationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client, ready, user } = useAuth();
  const [plantation, setPlantation] = useState<PlantationDetailType | null>(null);
  const [updates, setUpdates] = useState<MonitoringUpdateSummary[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reviewPending, setReviewPending] = useState(false);

  const load = useCallback(() => {
    if (!ready || !id) {
      return;
    }
    void Promise.all([
      client.getPlantation(id),
      client.listMonitoringUpdates(id),
      client.listPlantationReports(id),
      client.listVerifications({ subjectType: 'PLANTATION', subjectId: id }),
      client.listInspections(id),
    ])
      .then(([detail, page, reportPage, verificationPage, inspectionPage]) => {
        setPlantation(detail);
        setUpdates(page.items);
        setReports(reportPage.items);
        setVerifications(verificationPage.items);
        setInspections(inspectionPage.items);
        setError(null);
        void cachePlantationDetail(detail);
      })
      .catch((caught: unknown) => {
        void getCachedPlantationDetail(id).then((cached) => {
          setPlantation(cached);
          if (!cached) {
            setUpdates([]);
            setReports([]);
            setVerifications([]);
            setInspections([]);
          }
          setError(
            cached
              ? `${errorMessage(caught, 'Network unavailable')}. Showing a cached copy. Queue work stays on this device until sync.`
              : errorMessage(caught, 'Plantation not found'),
          );
        });
      });
  }, [client, id, ready]);

  useEffect(() => {
    load();
  }, [load]);

  if (!ready) {
    return (
      <Screen>
        <Loading label="Loading plantation…" />
      </Screen>
    );
  }

  const survival = plantation?.currentHealth
    ? formatSurvivalEstimate(
        plantation.currentHealth.estimatedSurvivingTrees,
        plantation.currentHealth.estimatedDeadTrees,
      )
    : null;

  return (
    <Screen>
      {error ? <Muted>{error}</Muted> : null}
      {plantation ? (
        <>
          <Muted>{plantation.verificationStatus}</Muted>
          <Heading>{plantation.name}</Heading>
          {plantation.description ? <Text style={{ fontSize: 16, lineHeight: 24, opacity: 0.85 }}>{plantation.description}</Text> : null}
          <Muted>{plantation.type === 'PLANTATION_SITE' ? 'Plantation site' : 'Individual tree'}</Muted>
          <Muted>Planted {formatDate(plantation.plantingDate)}</Muted>
          <Muted>{formatRecordedTrees(plantation.treeCount)}</Muted>
          <Muted>{plantation.areaHectares != null ? `${plantation.areaHectares} ha` : 'Area not recorded'}</Muted>
          <Muted>
            {[plantation.provinceCode, plantation.districtCode, plantation.dsdCode, plantation.gndCode]
              .filter(Boolean)
              .join(' → ') || 'Administrative area not recorded'}
          </Muted>
          <Muted>
            {formatCoordinates(
              plantation.coordinates.latitude,
              plantation.coordinates.longitude,
              plantation.coordinates.precision,
            )}
          </Muted>
          <Muted>
            Current health:{' '}
            {plantation.currentHealth
              ? `${formatHealth(plantation.currentHealth.healthStatus)} · ${formatDate(plantation.currentHealth.observedAt)}`
              : 'No verified monitoring update yet'}
          </Muted>
          {survival ? <Muted>{survival}</Muted> : null}
          {!plantation.currentHealth ? (
            <Muted>Monitoring history starts with verified field updates. This screen does not invent survival figures.</Muted>
          ) : null}
          {plantation.coverImage ? <StoredPhoto image={plantation.coverImage} alt={`${plantation.name} photograph`} /> : null}
          <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 12 }}>Species</Text>
          {plantation.species.map((row) => (
            <Muted key={row.speciesId}>
              {row.commonEnglishName} ({row.scientificName}) · {row.quantity.toLocaleString('en-LK')}
            </Muted>
          ))}
          {canVerifyRecords(user) && plantation.verificationStatus === 'SUBMITTED' ? (
            <Button
              label={reviewPending ? 'Starting review…' : 'Start review'}
              disabled={reviewPending}
              onPress={() => {
                setReviewPending(true);
                void client
                  .startPlantationReview(plantation.id)
                  .then(() => load())
                  .catch((caught: unknown) => setError(errorMessage(caught, 'Could not start review')))
                  .finally(() => setReviewPending(false));
              }}
            />
          ) : null}
          {canVerifyRecords(user) &&
          (plantation.verificationStatus === 'SUBMITTED' || plantation.verificationStatus === 'UNDER_REVIEW') ? (
            <OfficerPlantationDecision plantationId={plantation.id} onChanged={load} />
          ) : null}
          <PlantationOutbox plantationId={plantation.id} />
          <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 12 }}>Monitoring</Text>
          <MonitoringTimeline items={updates} onChanged={load} />
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>Submit an update</Text>
          <MonitoringForm plantationId={plantation.id} plantationName={plantation.name} onSubmitted={load} />
          <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 12 }}>Verification history</Text>
          {verifications.length === 0 ? (
            <Muted>No verification decisions are stored yet.</Muted>
          ) : (
            verifications.map((row) => (
              <Muted key={row.id}>
                {formatVerificationDecision(row.decision)} · {row.actor.displayName} · {formatDate(row.createdAt)}
                {row.notes ? ` — ${row.notes}` : ''}
              </Muted>
            ))
          )}
          <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 12 }}>Officer inspections</Text>
          <Muted>
            Official Forest Department visits. These are not citizen monitoring updates. Estimated tree counts do not
            replace the recorded total.
          </Muted>
          <InspectionsSection
            plantationId={plantation.id}
            plantationName={plantation.name}
            items={inspections}
            onChanged={load}
          />
          <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 12 }}>Reports</Text>
          <ReportList items={reports} onChanged={load} />
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>File a report</Text>
          <ReportForm plantationId={plantation.id} plantationName={plantation.name} onSubmitted={load} />
        </>
      ) : null}
    </Screen>
  );
}

function OfficerPlantationDecision({ plantationId, onChanged }: { plantationId: string; onChanged: () => void }) {
  const { client } = useAuth();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Field label="Verification notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText>{error}</ErrorText>
      <Button
        label={pending ? 'Saving…' : 'Verify plantation'}
        disabled={pending}
        onPress={() => {
          setPending(true);
          setError(null);
          void client
            .createVerification({
              subjectType: 'PLANTATION',
              subjectId: plantationId,
              decision: 'VERIFIED',
              notes: notes.trim().length >= 3 ? notes.trim() : null,
            })
            .then(() => {
              setNotes('');
              onChanged();
            })
            .catch((caught: unknown) => setError(errorMessage(caught, 'Could not verify')))
            .finally(() => setPending(false));
        }}
      />
      <Button
        label="Request correction"
        variant="secondary"
        disabled={pending}
        onPress={() => {
          setPending(true);
          setError(null);
          void client
            .createVerification({
              subjectType: 'PLANTATION',
              subjectId: plantationId,
              decision: 'REQUEST_CORRECTION',
              notes: notes.trim().length >= 3 ? notes.trim() : 'Correction requested from the field app.',
            })
            .then(() => {
              setNotes('');
              onChanged();
            })
            .catch((caught: unknown) => setError(errorMessage(caught, 'Could not request correction')))
            .finally(() => setPending(false));
        }}
      />
    </>
  );
}
