import { API_PREFIX } from '@forestwatch/config';
import type {
  ApiResponse,
  AuthSession,
  AuthSessionSummary,
  CampaignDetail,
  CampaignListPage,
  CampaignStatus,
  EmailVerificationQueued,
  LocationCatalogueStats,
  LocationDivision,
  NativeStatus,
  PaginationMeta,
  PasswordResetQueued,
  PublicUser,
  RegisterResult,
  SpeciesDetail,
  SpeciesListPage,
  PlantationDetail,
  PlantationListPage,
  PlantationType,
  PlantationVerificationStatus,
  MapPlantationsPage,
  NearbyPlantationsPage,
  MonitoringListPage,
  MonitoringUpdateDetail,
  CommentListPage,
  CommentNode,
  CommentReportResult,
  ReportDetail,
  ReportListPage,
  ReviewQueuePage,
  VerificationListPage,
  VerificationRecord,
  InspectionDetail,
  InspectionListPage,
  NotificationListPage,
  NotificationPreferenceList,
  NotificationRecord,
  PushDeviceRegistration,
  SearchPage,
  PublicImpactStats,
  MeDashboard,
  OfficerDashboard,
  AdminDashboard,
  ForestQuestProfile,
  ForestQuestUnavailable,
  ForestDex,
  PlantationDiscoveryList,
  MissionList,
  MissionItem,
  BadgeList,
} from '@forestwatch/types';
import type {
  CreateCampaignBody,
  CreateCommentBody,
  CreateInspectionBody,
  CreateMonitoringBody,
  CreatePlantationBody,
  CreateReportBody,
  CreateSpeciesBody,
  CreateVerificationBody,
  ForgotPasswordBody,
  LoginBody,
  LogoutBody,
  RefreshBody,
  RegisterBody,
  RegisterPushDeviceBody,
  ResendVerificationBody,
  ResetPasswordBody,
  SearchQuery,
  StatsQuery,
  UnregisterPushDeviceBody,
  UpdateCampaignBody,
  UpdateNotificationPreferencesBody,
  UpdatePlantationBody,
  UpdateReportBody,
  UpdateSpeciesBody,
  UpdateMeBody,
  VerifyEmailBody,
} from '@forestwatch/validation';

export class ForestWatchApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'ForestWatchApiError';
  }
}

export type ForestWatchApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
  fetchImpl?: typeof fetch;
  credentials?: 'include' | 'omit' | 'same-origin';
};

/** Browser File/Blob or a React Native FormData file part (`uri` + name + type). */
export type UploadPart =
  | Blob
  | {
      uri: string;
      name: string;
      type: string;
    };

function isUriUpload(file: UploadPart): file is { uri: string; name: string; type: string } {
  return typeof file === 'object' && file !== null && 'uri' in file && typeof file.uri === 'string';
}

function appendUpload(form: FormData, file: UploadPart, filename: string): void {
  if (isUriUpload(file)) {
    form.append('file', file as unknown as Blob);
    return;
  }
  form.append('file', file, filename);
}

export class ForestWatchApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly credentials: 'include' | 'omit' | 'same-origin';

  constructor(private readonly options: ForestWatchApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.credentials = options.credentials ?? 'include';
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async postForm<T>(path: string, body: FormData): Promise<T> {
    return this.request<T>('POST', path, body, true);
  }

  register(body: RegisterBody): Promise<RegisterResult> {
    return this.post('/auth/register', body);
  }

  login(body: LoginBody): Promise<AuthSession> {
    return this.post('/auth/login', body);
  }

  refresh(body: RefreshBody = {}): Promise<AuthSession> {
    return this.post('/auth/refresh', body);
  }

  logout(body: LogoutBody = {}): Promise<{ loggedOut: true }> {
    return this.post('/auth/logout', body);
  }

  logoutAll(): Promise<{ loggedOut: true }> {
    return this.post('/auth/logout-all', {});
  }

  me(): Promise<PublicUser> {
    return this.get('/auth/me');
  }

  updateMe(body: UpdateMeBody): Promise<PublicUser> {
    return this.patch('/auth/me', body);
  }

  sessions(): Promise<AuthSessionSummary[]> {
    return this.get('/auth/sessions');
  }

  verifyEmail(body: VerifyEmailBody): Promise<{ verified: true; user: PublicUser }> {
    return this.post('/auth/verify-email', body);
  }

  resendVerification(body: ResendVerificationBody): Promise<EmailVerificationQueued> {
    return this.post('/auth/resend-verification', body);
  }

  forgotPassword(body: ForgotPasswordBody): Promise<PasswordResetQueued> {
    return this.post('/auth/forgot-password', body);
  }

  resetPassword(body: ResetPasswordBody): Promise<{ reset: true }> {
    return this.post('/auth/reset-password', body);
  }

  locationStats(): Promise<LocationCatalogueStats> {
    return this.get('/locations/stats');
  }

  listProvinces(): Promise<LocationDivision[]> {
    return this.get('/locations/provinces');
  }

  listDistricts(provinceCode?: string): Promise<LocationDivision[]> {
    return this.get(this.pathWithQuery('/locations/districts', { provinceCode }));
  }

  listDsds(districtCode?: string): Promise<LocationDivision[]> {
    return this.get(this.pathWithQuery('/locations/dsds', { districtCode }));
  }

  listGnds(input: { dsdCode: string; page?: number; limit?: number; q?: string }): Promise<{
    items: LocationDivision[];
    meta: PaginationMeta;
  }> {
    return this.get(
      this.pathWithQuery('/locations/gnds', {
        dsdCode: input.dsdCode,
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        q: input.q,
      }),
    );
  }

  listCampaigns(input: {
    page?: number;
    limit?: number;
    q?: string;
    status?: CampaignStatus;
    scope?: 'public' | 'mine' | 'all';
  } = {}): Promise<CampaignListPage> {
    return this.get(
      this.pathWithQuery('/campaigns', {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        q: input.q,
        status: input.status,
        scope: input.scope,
      }),
    );
  }

  getCampaign(idOrSlug: string): Promise<CampaignDetail> {
    return this.get(`/campaigns/${encodeURIComponent(idOrSlug)}`);
  }

  createCampaign(body: CreateCampaignBody): Promise<CampaignDetail> {
    return this.post('/campaigns', body);
  }

  updateCampaign(idOrSlug: string, body: UpdateCampaignBody): Promise<CampaignDetail> {
    return this.patch(`/campaigns/${encodeURIComponent(idOrSlug)}`, body);
  }

  listSpecies(input: {
    page?: number;
    limit?: number;
    q?: string;
    nativeStatus?: NativeStatus;
    includeInactive?: boolean;
  } = {}): Promise<SpeciesListPage> {
    return this.get(
      this.pathWithQuery('/species', {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        q: input.q,
        nativeStatus: input.nativeStatus,
        includeInactive: input.includeInactive ? 'true' : undefined,
      }),
    );
  }

  getSpecies(idOrName: string): Promise<SpeciesDetail> {
    return this.get(`/species/${encodeURIComponent(idOrName)}`);
  }

  createSpecies(body: CreateSpeciesBody): Promise<SpeciesDetail> {
    return this.post('/species', body);
  }

  updateSpecies(idOrName: string, body: UpdateSpeciesBody): Promise<SpeciesDetail> {
    return this.patch(`/species/${encodeURIComponent(idOrName)}`, body);
  }

  listPlantations(input: {
    page?: number;
    limit?: number;
    q?: string;
    campaignId?: string;
    speciesId?: string;
    provinceCode?: string;
    districtCode?: string;
    dsdCode?: string;
    gndCode?: string;
    type?: PlantationType;
    verificationStatus?: PlantationVerificationStatus;
    scope?: 'public' | 'mine' | 'assigned' | 'all';
  } = {}): Promise<PlantationListPage> {
    return this.get(
      this.pathWithQuery('/plantations', {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        q: input.q,
        campaignId: input.campaignId,
        speciesId: input.speciesId,
        provinceCode: input.provinceCode,
        districtCode: input.districtCode,
        dsdCode: input.dsdCode,
        gndCode: input.gndCode,
        type: input.type,
        verificationStatus: input.verificationStatus,
        scope: input.scope,
      }),
    );
  }

  getPlantation(id: string): Promise<PlantationDetail> {
    return this.get(`/plantations/${encodeURIComponent(id)}`);
  }

  createPlantation(body: CreatePlantationBody): Promise<PlantationDetail> {
    return this.post('/plantations', body);
  }

  updatePlantation(id: string, body: UpdatePlantationBody): Promise<PlantationDetail> {
    return this.patch(`/plantations/${encodeURIComponent(id)}`, body);
  }

  uploadPlantationImage(id: string, file: UploadPart, filename = 'photo.jpg'): Promise<PlantationDetail> {
    const form = new FormData();
    appendUpload(form, file, filename);
    return this.postForm(`/plantations/${encodeURIComponent(id)}/images`, form);
  }

  deletePlantationImage(id: string, imageId: string): Promise<PlantationDetail> {
    return this.request('DELETE', `/plantations/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`);
  }

  uploadSpeciesImage(idOrName: string, file: UploadPart, filename = 'photo.jpg'): Promise<SpeciesDetail> {
    const form = new FormData();
    appendUpload(form, file, filename);
    return this.postForm(`/species/${encodeURIComponent(idOrName)}/image`, form);
  }

  deleteSpeciesImage(idOrName: string): Promise<SpeciesDetail> {
    return this.request('DELETE', `/species/${encodeURIComponent(idOrName)}/image`);
  }

  uploadCampaignBanner(idOrSlug: string, file: UploadPart, filename = 'banner.jpg'): Promise<CampaignDetail> {
    const form = new FormData();
    appendUpload(form, file, filename);
    return this.postForm(`/campaigns/${encodeURIComponent(idOrSlug)}/banner`, form);
  }

  deleteCampaignBanner(idOrSlug: string): Promise<CampaignDetail> {
    return this.request('DELETE', `/campaigns/${encodeURIComponent(idOrSlug)}/banner`);
  }

  listMapPlantations(input: {
    bbox: string;
    limit?: number;
    q?: string;
    campaignId?: string;
    speciesId?: string;
    provinceCode?: string;
    districtCode?: string;
    dsdCode?: string;
    gndCode?: string;
    type?: PlantationType;
    verificationStatus?: PlantationVerificationStatus;
  }): Promise<MapPlantationsPage> {
    return this.get(
      this.pathWithQuery('/map/plantations', {
        bbox: input.bbox,
        limit: input.limit ? String(input.limit) : undefined,
        q: input.q,
        campaignId: input.campaignId,
        speciesId: input.speciesId,
        provinceCode: input.provinceCode,
        districtCode: input.districtCode,
        dsdCode: input.dsdCode,
        gndCode: input.gndCode,
        type: input.type,
        verificationStatus: input.verificationStatus,
      }),
    );
  }

  listNearbyPlantations(input: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    limit?: number;
    q?: string;
    campaignId?: string;
    speciesId?: string;
    provinceCode?: string;
    districtCode?: string;
  }): Promise<NearbyPlantationsPage> {
    return this.get(
      this.pathWithQuery('/nearby/plantations', {
        lat: String(input.lat),
        lng: String(input.lng),
        radiusMeters: input.radiusMeters ? String(input.radiusMeters) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        q: input.q,
        campaignId: input.campaignId,
        speciesId: input.speciesId,
        provinceCode: input.provinceCode,
        districtCode: input.districtCode,
      }),
    );
  }

  listMonitoringUpdates(plantationId: string, input: { page?: number; limit?: number } = {}): Promise<MonitoringListPage> {
    return this.get(
      this.pathWithQuery(`/plantations/${encodeURIComponent(plantationId)}/updates`, {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
      }),
    );
  }

  getMonitoringUpdate(plantationId: string, updateId: string): Promise<MonitoringUpdateDetail> {
    return this.get(
      `/plantations/${encodeURIComponent(plantationId)}/updates/${encodeURIComponent(updateId)}`,
    );
  }

  createMonitoringUpdate(plantationId: string, body: CreateMonitoringBody): Promise<MonitoringUpdateDetail> {
    return this.post(`/plantations/${encodeURIComponent(plantationId)}/updates`, body);
  }

  uploadMonitoringImage(
    plantationId: string,
    updateId: string,
    file: UploadPart,
    filename = 'photo.jpg',
  ): Promise<MonitoringUpdateDetail> {
    const form = new FormData();
    appendUpload(form, file, filename);
    return this.postForm(
      `/plantations/${encodeURIComponent(plantationId)}/updates/${encodeURIComponent(updateId)}/images`,
      form,
    );
  }

  deleteMonitoringImage(plantationId: string, updateId: string, imageId: string): Promise<MonitoringUpdateDetail> {
    return this.request(
      'DELETE',
      `/plantations/${encodeURIComponent(plantationId)}/updates/${encodeURIComponent(updateId)}/images/${encodeURIComponent(imageId)}`,
    );
  }

  listComments(plantationId: string, input: { page?: number; limit?: number } = {}): Promise<CommentListPage> {
    return this.get(
      this.pathWithQuery(`/plantations/${encodeURIComponent(plantationId)}/comments`, {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
      }),
    );
  }

  createComment(plantationId: string, body: CreateCommentBody): Promise<CommentNode> {
    return this.post(`/plantations/${encodeURIComponent(plantationId)}/comments`, body);
  }

  deleteComment(plantationId: string, commentId: string): Promise<{ deleted: true }> {
    return this.request('DELETE', `/plantations/${encodeURIComponent(plantationId)}/comments/${encodeURIComponent(commentId)}`);
  }

  toggleCommentReaction(plantationId: string, commentId: string): Promise<CommentNode> {
    return this.post(`/plantations/${encodeURIComponent(plantationId)}/comments/${encodeURIComponent(commentId)}/reactions`, {
      type: 'HELPFUL',
    });
  }

  reportComment(plantationId: string, commentId: string): Promise<CommentReportResult> {
    return this.post(`/plantations/${encodeURIComponent(plantationId)}/comments/${encodeURIComponent(commentId)}/report`, {});
  }

  listPlantationReports(
    plantationId: string,
    input: { page?: number; limit?: number; category?: string; status?: string } = {},
  ): Promise<ReportListPage> {
    return this.get(
      this.pathWithQuery(`/plantations/${encodeURIComponent(plantationId)}/reports`, {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        category: input.category,
        status: input.status,
      }),
    );
  }

  createPlantationReport(plantationId: string, body: CreateReportBody): Promise<ReportDetail> {
    return this.post(`/plantations/${encodeURIComponent(plantationId)}/reports`, body);
  }

  listReports(
    input: {
      page?: number;
      limit?: number;
      plantationId?: string;
      category?: string;
      status?: string;
      scope?: 'mine' | 'assigned' | 'all';
    } = {},
  ): Promise<ReportListPage> {
    return this.get(
      this.pathWithQuery('/reports', {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        plantationId: input.plantationId,
        category: input.category,
        status: input.status,
        scope: input.scope,
      }),
    );
  }

  getReport(reportId: string): Promise<ReportDetail> {
    return this.get(`/reports/${encodeURIComponent(reportId)}`);
  }

  updateReportStatus(reportId: string, body: UpdateReportBody): Promise<ReportDetail> {
    return this.patch(`/reports/${encodeURIComponent(reportId)}`, body);
  }

  uploadReportImage(reportId: string, file: UploadPart, filename = 'photo.jpg'): Promise<ReportDetail> {
    const form = new FormData();
    appendUpload(form, file, filename);
    return this.postForm(`/reports/${encodeURIComponent(reportId)}/images`, form);
  }

  deleteReportImage(reportId: string, imageId: string): Promise<ReportDetail> {
    return this.request('DELETE', `/reports/${encodeURIComponent(reportId)}/images/${encodeURIComponent(imageId)}`);
  }

  getReviewQueue(): Promise<ReviewQueuePage> {
    return this.get('/review/queue');
  }

  listVerifications(input: {
    subjectType: 'PLANTATION' | 'MONITORING';
    subjectId: string;
    page?: number;
    limit?: number;
  }): Promise<VerificationListPage> {
    return this.get(
      this.pathWithQuery('/verifications', {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
      }),
    );
  }

  createVerification(body: CreateVerificationBody): Promise<VerificationRecord> {
    return this.post('/verifications', body);
  }

  startPlantationReview(plantationId: string): Promise<{ verificationStatus: 'UNDER_REVIEW' }> {
    return this.post(`/plantations/${encodeURIComponent(plantationId)}/review`, {});
  }

  listInspections(plantationId: string, input: { page?: number; limit?: number } = {}): Promise<InspectionListPage> {
    return this.get(
      this.pathWithQuery(`/plantations/${encodeURIComponent(plantationId)}/inspections`, {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
      }),
    );
  }

  createInspection(plantationId: string, body: CreateInspectionBody): Promise<InspectionDetail> {
    return this.post(`/plantations/${encodeURIComponent(plantationId)}/inspections`, body);
  }

  uploadInspectionImage(inspectionId: string, file: UploadPart, filename = 'photo.jpg'): Promise<InspectionDetail> {
    const form = new FormData();
    appendUpload(form, file, filename);
    return this.postForm(`/inspections/${encodeURIComponent(inspectionId)}/images`, form);
  }

  deleteInspectionImage(inspectionId: string, imageId: string): Promise<InspectionDetail> {
    return this.request('DELETE', `/inspections/${encodeURIComponent(inspectionId)}/images/${encodeURIComponent(imageId)}`);
  }

  listNotifications(input: { page?: number; limit?: number; unread?: boolean } = {}): Promise<NotificationListPage> {
    return this.get(
      this.pathWithQuery('/notifications', {
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
        unread: input.unread ? 'true' : undefined,
      }),
    );
  }

  markNotificationRead(id: string): Promise<NotificationRecord> {
    return this.post(`/notifications/${encodeURIComponent(id)}/read`, {});
  }

  markAllNotificationsRead(): Promise<{ updated: number }> {
    return this.post('/notifications/read-all', {});
  }

  listNotificationPreferences(): Promise<NotificationPreferenceList> {
    return this.get('/notification-preferences');
  }

  updateNotificationPreferences(body: UpdateNotificationPreferencesBody): Promise<NotificationPreferenceList> {
    return this.put('/notification-preferences', body);
  }

  registerPushDevice(body: RegisterPushDeviceBody): Promise<PushDeviceRegistration> {
    return this.post('/push/devices', body);
  }

  unregisterPushDevice(body: UnregisterPushDeviceBody): Promise<PushDeviceRegistration> {
    return this.request('DELETE', '/push/devices', body);
  }

  search(input: SearchQuery): Promise<SearchPage> {
    return this.get(
      this.pathWithQuery('/search', {
        q: input.q,
        kind: input.kind,
        page: input.page ? String(input.page) : undefined,
        limit: input.limit ? String(input.limit) : undefined,
      }),
    );
  }

  publicImpact(input: StatsQuery = {}): Promise<PublicImpactStats> {
    return this.get(
      this.pathWithQuery('/stats/public', {
        provinceCode: input.provinceCode,
        districtCode: input.districtCode,
        dsdCode: input.dsdCode,
        gndCode: input.gndCode,
        campaignId: input.campaignId,
        speciesId: input.speciesId,
        year: input.year ? String(input.year) : undefined,
      }),
    );
  }

  meDashboard(): Promise<MeDashboard> {
    return this.get('/dashboards/me');
  }

  officerDashboard(): Promise<OfficerDashboard> {
    return this.get('/dashboards/officer');
  }

  adminDashboard(): Promise<AdminDashboard> {
    return this.get('/dashboards/admin');
  }

  engagementProfile(): Promise<ForestQuestProfile> {
    return this.get('/engagement/profile');
  }

  engagementPassport(): Promise<ForestQuestUnavailable> {
    return this.get('/engagement/passport');
  }

  engagementMissions(): Promise<MissionList> {
    return this.get('/engagement/missions');
  }

  engagementMission(id: string): Promise<MissionItem> {
    return this.get(`/engagement/missions/${id}`);
  }

  engagementBadges(): Promise<BadgeList> {
    return this.get('/engagement/badges');
  }

  engagementForestDex(): Promise<ForestDex> {
    return this.get('/engagement/forestdex');
  }

  engagementDiscoveries(): Promise<PlantationDiscoveryList> {
    return this.get('/engagement/discoveries');
  }

  private pathWithQuery(path: string, query: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params.set(key, value);
      }
    }
    const encoded = params.toString();
    return encoded ? `${path}?${encoded}` : path;
  }

  private async request<T>(method: string, path: string, body?: unknown, multipart = false): Promise<T> {
    const token = await this.options.getAccessToken?.();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined && !multipart) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await this.fetchImpl(this.url(path), {
      method,
      headers,
      credentials: this.credentials,
      body: body === undefined ? undefined : multipart ? (body as FormData) : JSON.stringify(body),
    });

    const text = await response.text();
    let payload: ApiResponse<T>;
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      throw new ForestWatchApiError(
        'The ForestWatch API is not reachable. Nearby distance is calculated on the server — start apps/api or set API_ORIGIN on Vercel.',
        response.status || 502,
        'API_UNAVAILABLE',
      );
    }

    if (!payload.success) {
      throw new ForestWatchApiError(
        payload.error.message,
        response.status,
        payload.error.code,
        payload.error.details,
      );
    }

    if (!response.ok) {
      throw new ForestWatchApiError('Request failed', response.status);
    }

    return payload.data;
  }

  private url(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (this.baseUrl.endsWith(API_PREFIX) && normalized.startsWith(API_PREFIX)) {
      return `${this.baseUrl}${normalized.slice(API_PREFIX.length)}`;
    }

    return `${this.baseUrl}${normalized}`;
  }
}
