import type { HealthCondition, OfflineEntityKind, OfflineSyncStatus, ReportCategory } from '@forestwatch/types';

export type GpsSnapshot = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
};

export type MonitoringOutboxPayload = {
  healthStatus: HealthCondition;
  observation: string;
  estimatedSurvivingTrees: number | null;
  estimatedDeadTrees: number | null;
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracyMeters?: number | null;
};

export type ReportOutboxPayload = {
  category: ReportCategory;
  description: string;
};

export type InspectionOutboxPayload = {
  condition: HealthCondition;
  notes: string;
  recommendedAction: string | null;
  estimatedTreeCount: number | null;
  estimatedSurvivalPct: number | null;
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracyMeters?: number | null;
};

export type OutboxPayload = MonitoringOutboxPayload | ReportOutboxPayload | InspectionOutboxPayload;

export type OutboxRecord = {
  clientUuid: string;
  kind: OfflineEntityKind;
  plantationId: string;
  plantationName: string | null;
  payload: OutboxPayload;
  gps: GpsSnapshot | null;
  status: OfflineSyncStatus;
  serverId: string | null;
  lastError: string | null;
  rejectedPayload: OutboxPayload | null;
  createdAt: string;
  updatedAt: string;
  photoUri: string | null;
  photoFilename: string | null;
  photoMime: string | null;
  photoServerId: string | null;
};

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cached_plantations (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  cached_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cached_plantation_details (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  cached_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  client_uuid TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  plantation_id TEXT NOT NULL,
  plantation_name TEXT,
  payload TEXT NOT NULL,
  gps_json TEXT,
  status TEXT NOT NULL,
  server_id TEXT,
  last_error TEXT,
  rejected_payload TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  photo_uri TEXT,
  photo_filename TEXT,
  photo_mime TEXT,
  photo_server_id TEXT
);
`;
