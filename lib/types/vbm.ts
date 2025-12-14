export interface VBMSchedulePolicy {
  scheduleEnabled: boolean;
  backupWindowEnabled: boolean;
  periodicallyWindowEnabled: boolean;
  type: string;
  dailyType?: string;
  dailyTime?: string;
  retryEnabled: boolean;
  retryNumber: number;
  retryWaitInterval: number;
}

export interface VBMJobLinks {
  self: { href: string };
  copyJob?: { href: string };
  organization?: { href: string };
  backupRepository?: { href: string };
  jobsessions?: { href: string };
  excludedItems?: { href: string };
  selectedItems?: { href: string };
}

export * from './vbm-dashboard';
export interface VBMJob {
  id: string;
  name: string;
  description: string;
  backupType: string;
  schedulePolicy: VBMSchedulePolicy;
  organizationId: string;
  repositoryId: string;
  lastRun: string;
  nextRun: string;
  lastBackup?: string;
  isEnabled: boolean;
  lastStatus: string;
  eTag: number;
  _links: VBMJobLinks;
}

export interface VBMJobsResponse {
  offset: number;
  limit: number;
  _links: {
    self: { href: string };
  };
  results: VBMJob[];
}

export interface VBMJobSessionLinks {
  self: { href: string };
  log: { href: string };
  job: { href: string };
}

export interface VBMJobSessionStatistics {
  processingRateBytesPS: number;
  processingRateItemsPS: number;
  readRateBytesPS: number;
  writeRateBytesPS: number;
  transferredDataBytes: number;
  processedObjects: number;
  bottleneck: string;
}

export interface VBMJobSession {
  id: string;
  jobId: string;
  repositoryId: string;
  mainSessionId: string;
  details: string;
  creationTime: string;
  endTime?: string;
  retryCount: number;
  jobWillBeRetried: boolean;
  progress: number;
  jobType: string;
  status: string;
  statistics: VBMJobSessionStatistics;
  eTag: number;
  _links: VBMJobSessionLinks;
  proxyId?: string;
}

export interface VBMJobSessionsResponse {
  offset: number;
  limit: number;
  _links: {
    self: { href: string };
    next?: { href: string };
  };
  results: VBMJobSession[];
}

export interface VBMOrganization {
  id: string;
  name: string;
  type: string;
  region: string;
  isTeamsOnline: boolean;
  isExchangeOnline: boolean;
  isSharePointOnline: boolean;
  officeName: string;
  _links: {
    self: { href: string };
    jobs?: { href: string };
    groups?: { href: string };
    users?: { href: string };
    sites?: { href: string };
    teams?: { href: string };
    usedRepositories?: { href: string };
  };
}

export interface VBMOrganizationsResponse {
  offset: number;
  limit: number;
  results: VBMOrganization[];
}

export interface VBMUsedRepository {
  repositoryId: string;
  usedSpaceBytes: number;
  localCacheUsedSpaceBytes: number;
  objectStorageUsedSpaceBytes: number;
  isAvailable: boolean;
  protectedObjectsCount: number;
  _links: {
    backupRepository: { href: string };
  };
}

export interface VBMUsedRepositoriesResponse {
  offset: number;
  limit: number;
  results: VBMUsedRepository[];
}

export interface VBMProtectedUser {
  id: string;
  msid: string;
  displayName: string;
  name?: string; // Sometimes APIs use name/displayName interchangeably or one is missing
  accountType: string;
  organizationId: string;
  backedUpOrganizationId: string;
  mailboxes: { id: string; displayName: string; email: string; isArchive: boolean }[];
  oneDrives: { id: string; displayName: string; url: string }[];
  sites: { id: string; displayName: string; url: string }[];
  eTag: number;
}

export interface VBMProtectedGroup {
  id: string;
  msid: string;
  displayName: string;
  organizationId: string;
  backedUpOrganizationId: string;
  mailboxes: { id: string; displayName: string; email: string; isArchive: boolean }[];
  sites: { id: string; displayName: string; url: string }[];
  eTag: number;
}

export interface VBMProtectedSite {
  id: string;
  msid: string;
  displayName: string;
  url: string;
  organizationId: string;
  backedUpOrganizationId: string;
  eTag: number;
}

export interface VBMProtectedTeam {
  id: string;
  msid: string;
  displayName: string;
  description: string;
  organizationId: string;
  backedUpOrganizationId: string;
  eTag: number;
}

export type VBMProtectedItem = (VBMProtectedUser & { type: 'User' }) | (VBMProtectedGroup & { type: 'Group' }) | (VBMProtectedSite & { type: 'Site' }) | (VBMProtectedTeam & { type: 'Team' });

export interface VBMProtectedUsersResponse {
  offset: number;
  limit: number;
  results: VBMProtectedUser[];
}

export interface VBMProtectedGroupsResponse {
  offset: number;
  limit: number;
  results: VBMProtectedGroup[];
}

export interface VBMProtectedSitesResponse {
  offset: number;
  limit: number;
  results: VBMProtectedSite[];
}

export interface VBMProtectedTeamsResponse {
  offset: number;
  limit: number;
  results: VBMProtectedTeam[];
}

export interface VBMRestorePoint {
  id: string;
  isDeleted: boolean;
  repositoryId: string;
  backupTime: string;
  jobId: string;
  organizationId: string;
  isExchange: boolean;
  isSharePoint: boolean;
  isOneDrive: boolean;
  isTeams: boolean;
  isLongTermCopy: boolean;
  isCopy: boolean;
  isRetrieved: boolean;
  eTag: number;
  objectsEtag: number;
  _links: {
    self: { href: string };
    organization: { href: string };
    backupRepository: { href: string };
  };
}

export interface VBMRestorePointsResponse {
  offset: number;
  limit: number;
  results: VBMRestorePoint[];
}

export interface VBMBackupRepository {
  id: string;
  name: string;
  description: string;
  office365SoftDeleteDuration: string;
  adalConfigurationId: string;
  globalRetentionPolicyEnabled: boolean;
  type: string;
  _links: {
    self: { href: string };
  };
}

export interface VBMBackupRepositoriesResponse {
  offset: number;
  limit: number;
  results: VBMBackupRepository[];
}
