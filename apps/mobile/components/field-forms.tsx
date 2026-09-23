import type { HealthCondition, InspectionSummary, MonitoringUpdateSummary, ReportSummary } from '@forestwatch/types';
import { HEALTH_CONDITIONS, REPORT_CATEGORIES, type ReportCategory, type ReportStatus, type VerificationDecision } from '@forestwatch/types';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { StoredPhoto } from '@/components/StoredPhoto';
import { Body, Button, Card, ErrorText, Field, Muted } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';
import {
  formatDate,
  formatDistanceMeters,
  formatHealth,
  formatOfflineStatus,
  formatProximity,
  formatReportCategory,
  formatReportStatus,
  formatSurvivalEstimate,
  formatVerificationDecision,
} from '@/lib/format';
import { gpsFieldsForApi } from '@/lib/geo';
import { requestDeviceFix } from '@/lib/location';
import { useOffline, usePlantationOutbox } from '@/lib/offline-context';
import { canListAllReports, canReviewReports, canVerifyRecords, nextReportStatuses } from '@/lib/permissions';
import { pickFieldPhoto, type FieldPhoto } from '@/lib/photo';

function PhotoButtons({ onPicked }: { onPicked: (photo: FieldPhoto | null) => void }) {
  return (
    <View style={styles.row}>
      <Button label="Camera" variant="secondary" onPress={() => void pickFieldPhoto('camera').then(onPicked)} />
      <Button label="Library" variant="secondary" onPress={() => void pickFieldPhoto('library').then(onPicked)} />
    </View>
  );
}

export function MonitoringForm({
  plantationId,
  plantationName,
  onSubmitted,
}: {
  plantationId: string;
  plantationName?: string;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const { enqueue } = useOffline();
  const [healthStatus, setHealthStatus] = useState<HealthCondition>('UNKNOWN');
  const [observation, setObservation] = useState('');
  const [surviving, setSurviving] = useState('');
  const [dead, setDead] = useState('');
  const [photo, setPhoto] = useState<FieldPhoto | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [queued, setQueued] = useState<string | null>(null);

  if (!user) {
    return <Muted>Sign in from Profile to submit a monitoring update. Guests cannot post observations.</Muted>;
  }

  const save = (asDraft: boolean) => {
    if (observation.trim().length < 3) {
      setError('Describe what you observed.');
      return;
    }
    setPending(true);
    setError(null);
    void (async () => {
      const fix = await requestDeviceFix();
      setGpsNote(
        fix
          ? gpsFieldsForApi(fix).latitude
            ? null
            : 'Device GPS is outside Sri Lanka. It is stored locally but not sent as a monitoring coordinate.'
          : 'Location permission was not granted. GPS is not invented; this update is location unavailable.',
      );
      try {
        const record = await enqueue({
          kind: 'MONITORING',
          plantationId,
          plantationName,
          asDraft,
          gps: fix
            ? {
                latitude: fix.latitude,
                longitude: fix.longitude,
                accuracyMeters: fix.accuracyMeters,
                capturedAt: new Date().toISOString(),
              }
            : null,
          payload: {
            healthStatus,
            observation: observation.trim(),
            estimatedSurvivingTrees: surviving ? Number(surviving) : null,
            estimatedDeadTrees: dead ? Number(dead) : null,
            ...gpsFieldsForApi(fix),
          },
          photo,
        });
        setObservation('');
        setSurviving('');
        setDead('');
        setPhoto(null);
        setQueued(
          record.status === 'SYNCED'
            ? 'Update synced. An officer still has to verify it.'
            : `${formatOfflineStatus(record.status)}. Distance and verification stay on the server.`,
        );
        onSubmitted();
      } catch (caught: unknown) {
        setError(errorMessage(caught, 'Could not save update'));
      } finally {
        setPending(false);
      }
    })();
  };

  return (
    <View style={styles.form}>
      <Muted>Condition: {formatHealth(healthStatus)}</Muted>
      <View style={styles.wrap}>
        {HEALTH_CONDITIONS.map((status) => (
          <Button
            key={status}
            label={formatHealth(status)}
            variant={healthStatus === status ? 'primary' : 'secondary'}
            onPress={() => setHealthStatus(status)}
          />
        ))}
      </View>
      <Field label="Observation" value={observation} onChangeText={setObservation} multiline />
      <Field label="Estimated surviving trees" value={surviving} onChangeText={setSurviving} keyboardType="number-pad" />
      <Field label="Estimated dead trees" value={dead} onChangeText={setDead} keyboardType="number-pad" />
      <Muted>Survival figures are estimates from this visit. They do not replace the recorded tree count.</Muted>
      <PhotoButtons onPicked={setPhoto} />
      {photo ? <Muted>Photograph selected: {photo.filename}</Muted> : <Muted>Photograph optional. Offline copies stay on device until the server confirms.</Muted>}
      {gpsNote ? <Muted>{gpsNote}</Muted> : null}
      {queued ? <Muted>{queued}</Muted> : null}
      <ErrorText>{error}</ErrorText>
      <Button label={pending ? 'Saving…' : 'Save draft'} disabled={pending} variant="secondary" onPress={() => save(true)} />
      <Button label={pending ? 'Queueing…' : 'Queue monitoring update'} disabled={pending} onPress={() => save(false)} />
    </View>
  );
}

export function MonitoringTimeline({ items, onChanged }: { items: MonitoringUpdateSummary[]; onChanged: () => void }) {
  if (items.length === 0) {
    return <Muted>No monitoring updates are visible yet. This screen does not invent survival figures.</Muted>;
  }

  return (
    <View style={styles.stack}>
      {items.map((row) => {
        const estimate = formatSurvivalEstimate(row.estimatedSurvivingTrees, row.estimatedDeadTrees);
        return (
          <Card key={row.id}>
            <Muted>
              {row.verificationStatus} · {formatProximity(row.locationValidation)}
            </Muted>
            <Text style={styles.title}>{formatHealth(row.healthStatus)}</Text>
            <Muted>
              {formatDate(row.observedAt)} · {row.observer.displayName}
              {row.distanceFromPlantation != null ? ` · ${formatDistanceMeters(row.distanceFromPlantation)} from site` : ''}
            </Muted>
            <Body>{row.observation}</Body>
            {estimate ? <Muted>{estimate}</Muted> : null}
            {row.coverImage ? <StoredPhoto image={row.coverImage} alt="Monitoring photograph" /> : null}
            <MonitoringVerifyActions update={row} onChanged={onChanged} />
          </Card>
        );
      })}
    </View>
  );
}

function MonitoringVerifyActions({
  update,
  onChanged,
}: {
  update: MonitoringUpdateSummary;
  onChanged: () => void;
}) {
  const { client, user } = useAuth();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<VerificationDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canVerifyRecords(user)) {
    return null;
  }

  return (
    <View style={styles.form}>
      <Field label="Officer notes" value={notes} onChangeText={setNotes} multiline />
      <View style={styles.row}>
        {(['VERIFIED', 'REJECTED'] as VerificationDecision[]).map((decision) => (
          <Button
            key={decision}
            label={pending === decision ? 'Saving…' : formatVerificationDecision(decision)}
            disabled={pending != null}
            variant="secondary"
            onPress={() => {
              setPending(decision);
              setError(null);
              void client
                .createVerification({
                  subjectType: 'MONITORING',
                  subjectId: update.id,
                  decision,
                  notes: notes.trim().length >= 3 ? notes.trim() : null,
                })
                .then(() => {
                  setNotes('');
                  onChanged();
                })
                .catch((caught: unknown) => setError(errorMessage(caught, 'Could not record verification')))
                .finally(() => setPending(null));
            }}
          />
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

export function ReportForm({
  plantationId,
  plantationName,
  onSubmitted,
}: {
  plantationId: string;
  plantationName?: string;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const { enqueue } = useOffline();
  const [category, setCategory] = useState<ReportCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<FieldPhoto | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState<string | null>(null);

  if (!user) {
    return <Muted>Sign in to file an issue report. Guests cannot see these reports.</Muted>;
  }

  const save = (asDraft: boolean) => {
    if (description.trim().length < 8) {
      setError('Describe what you observed.');
      return;
    }
    setPending(true);
    setError(null);
    void enqueue({
      kind: 'REPORT',
      plantationId,
      plantationName,
      asDraft,
      gps: null,
      payload: { category, description: description.trim() },
      photo,
    })
      .then((record) => {
        setDescription('');
        setPhoto(null);
        setQueued(
          record.status === 'SYNCED'
            ? 'Report filed as open. Officer review is a separate workflow.'
            : `${formatOfflineStatus(record.status)}. The report is not public guest content.`,
        );
        onSubmitted();
      })
      .catch((caught: unknown) => setError(errorMessage(caught, 'Could not save report')))
      .finally(() => setPending(false));
  };

  return (
    <View style={styles.form}>
      <Muted>Category: {formatReportCategory(category)}</Muted>
      <View style={styles.wrap}>
        {REPORT_CATEGORIES.map((item) => (
          <Button
            key={item}
            label={formatReportCategory(item)}
            variant={category === item ? 'primary' : 'secondary'}
            onPress={() => setCategory(item)}
          />
        ))}
      </View>
      <Field label="What did you observe?" value={description} onChangeText={setDescription} multiline />
      <PhotoButtons onPicked={setPhoto} />
      {photo ? <Muted>Photograph selected: {photo.filename}</Muted> : null}
      <Muted>Issue reports start as open. They are not public guest content and they do not change recorded tree counts.</Muted>
      {queued ? <Muted>{queued}</Muted> : null}
      <ErrorText>{error}</ErrorText>
      <Button label={pending ? 'Saving…' : 'Save draft'} disabled={pending} variant="secondary" onPress={() => save(true)} />
      <Button label={pending ? 'Queueing…' : 'Queue report'} disabled={pending} onPress={() => save(false)} />
    </View>
  );
}

export function ReportList({ items, onChanged }: { items: ReportSummary[]; onChanged: () => void }) {
  const { user } = useAuth();
  if (!user) {
    return <Muted>Issue reports stay hidden from guests.</Muted>;
  }
  if (items.length === 0) {
    return <Muted>No issue reports you are allowed to see on this record.</Muted>;
  }

  return (
    <View style={styles.stack}>
      {items.map((report) => (
        <Card key={report.id}>
          <Muted>
            {formatReportStatus(report.status)} · {formatReportCategory(report.category)}
          </Muted>
          <Body>{report.description}</Body>
          <Muted>
            {report.reporter.displayName} · {formatDate(report.createdAt)}
          </Muted>
          {report.coverImage ? <StoredPhoto image={report.coverImage} alt="Report photograph" /> : null}
          <ReportStatusActions report={report} onChanged={onChanged} />
        </Card>
      ))}
    </View>
  );
}

function ReportStatusActions({ report, onChanged }: { report: ReportSummary; onChanged: () => void }) {
  const { client, user } = useAuth();
  const [pending, setPending] = useState<ReportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = canReviewReports(user) ? nextReportStatuses(report.status, canListAllReports(user)) : [];
  if (next.length === 0) {
    return null;
  }

  return (
    <View style={styles.form}>
      <View style={styles.wrap}>
        {next.map((status) => (
          <Button
            key={status}
            label={pending === status ? 'Saving…' : formatReportStatus(status)}
            disabled={pending != null}
            variant="secondary"
            onPress={() => {
              setPending(status);
              setError(null);
              void client
                .updateReportStatus(report.id, { status })
                .then(() => onChanged())
                .catch((caught: unknown) => setError(errorMessage(caught, 'Could not update report')))
                .finally(() => setPending(null));
            }}
          />
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

export function InspectionsSection({
  plantationId,
  plantationName,
  items,
  onChanged,
}: {
  plantationId: string;
  plantationName?: string;
  items: InspectionSummary[];
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const { enqueue } = useOffline();
  const [condition, setCondition] = useState<HealthCondition>('UNKNOWN');
  const [notes, setNotes] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [estimatedTreeCount, setEstimatedTreeCount] = useState('');
  const [estimatedSurvivalPct, setEstimatedSurvivalPct] = useState('');
  const [photo, setPhoto] = useState<FieldPhoto | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const canInspect = canVerifyRecords(user);

  return (
    <View style={styles.stack}>
      {items.length === 0 ? (
        <Muted>No officer inspections are stored for this record.</Muted>
      ) : (
        items.map((row) => (
          <Card key={row.id} inset>
            <Muted>Forest Officer inspection</Muted>
            <Text style={styles.title}>{formatHealth(row.condition)}</Text>
            <Muted>
              {formatDate(row.inspectedAt)} · {row.officer.displayName}
            </Muted>
            <Body>{row.notes}</Body>
            {row.recommendedAction ? <Muted>Recommended action: {row.recommendedAction}</Muted> : null}
            {row.estimatedTreeCount != null || row.estimatedSurvivalPct != null ? (
              <Muted>
                {row.estimatedTreeCount != null ? `${row.estimatedTreeCount.toLocaleString('en-LK')} estimated trees` : ''}
                {row.estimatedTreeCount != null && row.estimatedSurvivalPct != null ? ' · ' : ''}
                {row.estimatedSurvivalPct != null ? `${row.estimatedSurvivalPct}% estimated survival` : ''}
                . Inspection estimates do not change recorded trees.
              </Muted>
            ) : null}
            {row.coverImage ? <StoredPhoto image={row.coverImage} alt="Officer inspection photograph" /> : null}
          </Card>
        ))
      )}
      {canInspect ? (
        <View style={styles.form}>
          <Text style={styles.title}>Record an inspection</Text>
          <View style={styles.wrap}>
            {HEALTH_CONDITIONS.map((status) => (
              <Button
                key={status}
                label={formatHealth(status)}
                variant={condition === status ? 'primary' : 'secondary'}
                onPress={() => setCondition(status)}
              />
            ))}
          </View>
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
          <Field label="Recommended action" value={recommendedAction} onChangeText={setRecommendedAction} />
          <Field label="Estimated tree count" value={estimatedTreeCount} onChangeText={setEstimatedTreeCount} keyboardType="number-pad" />
          <Field label="Estimated survival %" value={estimatedSurvivalPct} onChangeText={setEstimatedSurvivalPct} keyboardType="decimal-pad" />
          <PhotoButtons onPicked={setPhoto} />
          {gpsNote ? <Muted>{gpsNote}</Muted> : null}
          <ErrorText>{error}</ErrorText>
          <Button
            label={pending ? 'Saving…' : 'Save inspection draft'}
            disabled={pending}
            variant="secondary"
            onPress={() => {
              void saveInspection(true);
            }}
          />
          <Button
            label={pending ? 'Queueing…' : 'Queue inspection'}
            disabled={pending}
            onPress={() => {
              void saveInspection(false);
            }}
          />
        </View>
      ) : null}
    </View>
  );

  async function saveInspection(asDraft: boolean) {
    if (notes.trim().length < 8) {
      setError('Describe the inspection.');
      return;
    }
    setPending(true);
    setError(null);
    const fix = await requestDeviceFix();
    setGpsNote(
      fix
        ? gpsFieldsForApi(fix).latitude
          ? null
          : 'Device GPS is outside Sri Lanka. It is stored locally but not sent as inspection coordinates.'
        : 'Location permission was not granted. GPS is not invented.',
    );
    try {
      await enqueue({
        kind: 'INSPECTION',
        plantationId,
        plantationName,
        asDraft,
        gps: fix
          ? {
              latitude: fix.latitude,
              longitude: fix.longitude,
              accuracyMeters: fix.accuracyMeters,
              capturedAt: new Date().toISOString(),
            }
          : null,
        payload: {
          condition,
          notes: notes.trim(),
          recommendedAction: recommendedAction.trim() || null,
          estimatedTreeCount: estimatedTreeCount ? Number(estimatedTreeCount) : null,
          estimatedSurvivalPct: estimatedSurvivalPct ? Number(estimatedSurvivalPct) : null,
          ...gpsFieldsForApi(fix),
        },
        photo,
      });
      setNotes('');
      setRecommendedAction('');
      setEstimatedTreeCount('');
      setEstimatedSurvivalPct('');
      setPhoto(null);
      onChanged();
    } catch (caught: unknown) {
      setError(errorMessage(caught, 'Could not save inspection'));
    } finally {
      setPending(false);
    }
  }
}

export function PlantationOutbox({ plantationId }: { plantationId: string }) {
  const items = usePlantationOutbox(plantationId);
  const { queueDraft } = useOffline();
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>Device queue</Text>
      {items.map((row) => (
        <Card key={row.clientUuid}>
          <Muted>
            {formatOfflineStatus(row.status)} · {row.kind}
          </Muted>
          {row.lastError ? <Muted>{row.lastError}</Muted> : null}
          {row.status === 'LOCAL_DRAFT' || row.status === 'SYNC_FAILED' ? (
            <Button label="Queue for sync" variant="secondary" onPress={() => void queueDraft(row.clientUuid)} />
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 10,
  },
  stack: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});
