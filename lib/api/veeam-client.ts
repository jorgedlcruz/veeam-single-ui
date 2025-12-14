// Veeam Backup & Replication API Client
// This client now uses Next.js API routes to avoid CORS issues

import {
  VeeamBackupJob,
  VeeamSession,
  JobsResult,
  SessionsResult,
  VeeamApiError,
  ManagedServer,
  ManagedServersResult,
  RepositoryModel,
  RepositoriesResult,
  LicenseModel,
  MalwareEventModel,
  MalwareEventsResult,
  SecurityBestPracticeItem,
  SecurityBestPracticesResult,
  VeeamTaskSession,
  TaskSessionsResult,
  VRORecoveryPlan,
  PlansResult,
  VeeamBackup,
  VeeamBackupFile,
  BackupsResult,
  VeeamProtectedWorkload,
  VeeamRestorePoint
} from '@/lib/types/veeam';
import { VBMJob, VBMJobsResponse, VBMJobSession, VBMJobSessionsResponse, VBMLicense, VBMHealth, VBMServiceInstance, VBMOrganization, VBMOrganizationsResponse, VBMUsedRepositoriesResponse, VBMUsedRepository, VBMProtectedUser, VBMProtectedUsersResponse, VBMProtectedGroup, VBMProtectedGroupsResponse, VBMProtectedSite, VBMProtectedSitesResponse, VBMProtectedTeam, VBMProtectedTeamsResponse, VBMRestorePoint, VBMRestorePointsResponse, VBMBackupRepository, VBMBackupRepositoriesResponse } from '@/lib/types/vbm';
import { AuthDebouncer, RateLimiter } from '@/lib/utils/rate-limiter';

interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  '.issued': string;
  '.expires': string;
  username: string;
}

class VeeamApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // VRO tokens (separate from VBR)
  private vroToken: string | null = null;
  private vroRefreshToken: string | null = null;
  private vroTokenExpiry: Date | null = null;

  // VBM tokens (separate from VBR and VRO)
  private vbmToken: string | null = null;
  private vbmRefreshToken: string | null = null;
  private vbmTokenExpiry: Date | null = null;

  // Rate limiting and debouncing for VBM (1 request per second limit)
  private vbmRateLimiter = new RateLimiter(1);
  private vbmAuthDebouncer = new AuthDebouncer<string>(3000); // Cache auth for 3 seconds

  private async authenticate(): Promise<string> {
    // Check if token exists and is still valid (with 5 minute buffer)
    if (this.token && this.tokenExpiry) {
      const now = new Date();
      const bufferMs = 5 * 60 * 1000; // 5 minutes
      if (now.getTime() < this.tokenExpiry.getTime() - bufferMs) {
        return this.token;
      }

      // Token expired, try to refresh if we have a refresh token
      if (this.refreshToken) {
        try {
          return await this.refreshAccessToken();
        } catch (error) {
          console.warn('Token refresh failed, re-authenticating:', error);
          // Fall through to full authentication
        }
      }
    }

    try {
      const response = await fetch('/api/veeam/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grant_type: 'password' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Authentication failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      this.token = data.access_token;
      this.refreshToken = data.refresh_token;

      // Calculate token expiry (expires_in is in seconds)
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return this.token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/veeam/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Token refresh failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      this.token = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return this.token;
    } catch (error) {
      // Clear tokens on refresh failure
      this.token = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      throw error;
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await this.authenticate();

    const url = `/api/veeam${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text };
    }

    if (!response.ok) {
      const errorMessage = data.error || data.message || `API request failed: ${response.status} ${response.statusText}`;
      // Throw a proper Error object so that calling code (like catch blocks) can access .message
      throw new Error(errorMessage);
    }

    return data as T;
  }

  async logout(): Promise<void> {
    // Clear local tokens (server-side logout is handled by token expiration)
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  async getBackupJobs(options?: {
    skip?: number;
    limit?: number;
    orderColumn?: string;
    orderAsc?: boolean;
    nameFilter?: string;
    typeFilter?: string;
  }): Promise<VeeamBackupJob[]> {
    try {
      const params = new URLSearchParams();
      if (options?.skip !== undefined) params.append('skip', options.skip.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      if (options?.orderAsc !== undefined) params.append('orderAsc', options.orderAsc.toString());
      if (options?.nameFilter) params.append('nameFilter', options.nameFilter);
      if (options?.typeFilter) params.append('typeFilter', options.typeFilter);

      const queryString = params.toString();
      // Use the new /jobs/states endpoint for better performance and more data
      const endpoint = queryString ? `/jobs/states?${queryString}` : '/jobs/states';

      const response = await this.request<JobsResult>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching backup jobs:', error);
      throw error;
    }
  }

  async getBackupJobById(id: string): Promise<VeeamBackupJob> {
    try {
      return await this.request<VeeamBackupJob>(`/jobs/${id}`);
    } catch (error) {
      console.error(`Error fetching backup job ${id}:`, error);
      throw error;
    }
  }

  async startJob(id: string): Promise<void> {
    try {
      await this.request(`/jobs/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      });
    } catch (error) {
      console.error(`Error starting job ${id}:`, error);
      throw error;
    }
  }

  async stopJob(id: string): Promise<void> {
    try {
      await this.request(`/jobs/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' }),
      });
    } catch (error) {
      console.error(`Error stopping job ${id}:`, error);
      throw error;
    }
  }

  async retryJob(id: string): Promise<void> {
    try {
      await this.request(`/jobs/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'retry' }),
      });
    } catch (error) {
      console.error(`Error retrying job ${id}:`, error);
      throw error;
    }
  }

  async disableJob(id: string): Promise<void> {
    try {
      await this.request(`/jobs/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'disable' }),
      });
    } catch (error) {
      console.error(`Error disabling job ${id}:`, error);
      throw error;
    }
  }

  async enableJob(id: string): Promise<void> {
    try {
      await this.request(`/jobs/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'enable' }),
      });
    } catch (error) {
      console.error(`Error enabling job ${id}:`, error);
      throw error;
    }
  }

  async getSessions(options?: {
    skip?: number;
    limit?: number;
    orderColumn?: string;
    orderAsc?: boolean;
    nameFilter?: string;
    jobIdFilter?: string;
    stateFilter?: string;
    resultFilter?: string[];
    createdAfterFilter?: string;
    createdBeforeFilter?: string;
    endedAfterFilter?: string;
    endedBeforeFilter?: string;
  }): Promise<VeeamSession[]> {
    try {
      const params = new URLSearchParams();
      if (options?.skip !== undefined) params.append('skip', options.skip.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      if (options?.orderColumn) params.append('orderColumn', options.orderColumn);
      if (options?.orderAsc !== undefined) params.append('orderAsc', options.orderAsc.toString());
      if (options?.nameFilter) params.append('nameFilter', options.nameFilter);
      if (options?.jobIdFilter) params.append('jobIdFilter', options.jobIdFilter);
      if (options?.stateFilter) params.append('stateFilter', options.stateFilter);
      if (options?.resultFilter) {
        options.resultFilter.forEach(r => params.append('resultFilter', r));
      }
      if (options?.createdAfterFilter) params.append('createdAfterFilter', options.createdAfterFilter);
      if (options?.createdBeforeFilter) params.append('createdBeforeFilter', options.createdBeforeFilter);
      if (options?.endedAfterFilter) params.append('endedAfterFilter', options.endedAfterFilter);
      if (options?.endedBeforeFilter) params.append('endedBeforeFilter', options.endedBeforeFilter);

      const queryString = params.toString();
      const endpoint = queryString ? `/sessions?${queryString}` : '/sessions';

      const response = await this.request<SessionsResult>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  async getSessionById(id: string): Promise<VeeamSession> {
    try {
      return await this.request<VeeamSession>(`/sessions/${id}`);
    } catch (error) {
      console.error(`Error fetching session ${id}:`, error);
      throw error;
    }
  }

  async getJobSessions(jobId: string, limit: number = 10): Promise<VeeamSession[]> {
    return this.getSessions({
      jobIdFilter: jobId,
      limit,
      orderColumn: 'CreationTime',
      orderAsc: false,
    });
  }

  async getManagedServers(options?: {
    skip?: number;
    limit?: number;
    orderColumn?: string;
    orderAsc?: boolean;
    nameFilter?: string;
    typeFilter?: string;
  }): Promise<ManagedServer[]> {
    try {
      const params = new URLSearchParams();
      if (options?.skip !== undefined) params.append('skip', options.skip.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      if (options?.orderColumn) params.append('orderColumn', options.orderColumn);
      if (options?.orderAsc !== undefined) params.append('orderAsc', options.orderAsc.toString());
      if (options?.nameFilter) params.append('nameFilter', options.nameFilter);
      if (options?.typeFilter) params.append('typeFilter', options.typeFilter);

      const queryString = params.toString();
      const endpoint = queryString ? `/backupInfrastructure/managedServers?${queryString}` : '/backupInfrastructure/managedServers';

      const response = await this.request<ManagedServersResult>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching managed servers:', error);
      throw error;
    }
  }

  async getRepositories(): Promise<RepositoryModel[]> {
    try {
      const response = await this.request<RepositoriesResult>('/backupInfrastructure/repositories');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching repositories:', error);
      // Return empty array instead of throwing to prevent dashboard crash
      return [];
    }
  }

  async getLicenseInfo(): Promise<LicenseModel | null> {
    try {
      // The API endpoint might return direct model or wrapped
      // Based on Swagger proxy: /api/v1/license
      return await this.request<LicenseModel>('/license');
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      // Check if it's a permission error
      if (err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('Permission denied')) {
        console.warn('⚠️ License info unavailable: User lacks GetInstalledLicense permission (Veeam Backup Administrator role required)');
      } else {
        console.error('Error fetching license info:', error);
      }
      return null;
    }
  }

  async getMalwareEvents(options?: {
    limit?: number;
  }): Promise<MalwareEventModel[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/malware-detection?${queryString}` : '/malware-detection';

      const response = await this.request<MalwareEventsResult>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching malware events:', error);
      return [];
    }
  }

  async getSecurityBestPractices(): Promise<SecurityBestPracticeItem[]> {
    try {
      const response = await this.request<SecurityBestPracticesResult>('/security/best-practices');
      return response.items || [];
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      // Check if it's a permission error
      if (err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('Permission denied')) {
        console.warn('⚠️ Security best practices unavailable: User lacks GetBestPracticesComplianceResult permission (Veeam Backup/Security Administrator role required)');
      } else {
        console.error('Error fetching security best practices:', error);
      }
      return [];
    }
  }

  async getSessionTasks(sessionId: string): Promise<VeeamTaskSession[]> {
    try {
      // Fetch details including task sessions
      const response = await this.request<TaskSessionsResult>(`/sessions/${sessionId}/tasks`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching tasks for session ${sessionId}:`, error);
      throw error;
    }
  }

  async getProtectedData(): Promise<VeeamProtectedWorkload[]> {
    try {
      const token = await this.authenticate();
      const response = await fetch('/api/vbr/protected-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch protected data: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching protected data:', error);
      throw error;
    }
  }

  async getBackupFiles(backupId: string): Promise<VeeamBackupFile[]> {
    try {
      const token = await this.authenticate();
      const response = await fetch(`/api/vbr/backups/${backupId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch backup files: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error(`Error fetching backup files for ${backupId}:`, error);
      throw error;
    }
  }



  async getVBRRestorePoints(params: { objectId?: string, backupId?: string }): Promise<VeeamRestorePoint[]> {
    try {
      const token = await this.authenticate();
      const query = new URLSearchParams();
      if (params.objectId) query.append('objectId', params.objectId);
      if (params.backupId) query.append('backupId', params.backupId);

      const response = await fetch(`/api/vbr/restore-points?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch restore points: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching VBR restore points:', error);
      throw error;
    }
  }



  // ============================================
  // Veeam Recovery Orchestrator (VRO) Methods
  // ============================================

  private async authenticateVRO(): Promise<string> {
    // Check if token exists and is still valid (with 5 minute buffer)
    if (this.vroToken && this.vroTokenExpiry) {
      const now = new Date();
      const bufferMs = 5 * 60 * 1000; // 5 minutes
      if (now.getTime() < this.vroTokenExpiry.getTime() - bufferMs) {
        return this.vroToken;
      }

      // Token expired, try to refresh if we have a refresh token
      if (this.vroRefreshToken) {
        try {
          return await this.refreshVROAccessToken();
        } catch (error) {
          console.warn('VRO token refresh failed, re-authenticating:', error);
          // Fall through to full authentication
        }
      }
    }

    try {
      const response = await fetch('/api/vro/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grant_type: 'password' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `VRO authentication failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      this.vroToken = data.access_token;
      this.vroRefreshToken = data.refresh_token;

      // Calculate token expiry (expires_in is in seconds)
      this.vroTokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return this.vroToken;
    } catch (error) {
      console.error('VRO authentication error:', error);
      throw error;
    }
  }

  private async refreshVROAccessToken(): Promise<string> {
    if (!this.vroRefreshToken) {
      throw new Error('No VRO refresh token available');
    }

    try {
      const response = await fetch('/api/vro/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.vroRefreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `VRO token refresh failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      this.vroToken = data.access_token;
      this.vroRefreshToken = data.refresh_token;
      this.vroTokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return this.vroToken;
    } catch (error) {
      // Clear tokens on refresh failure
      this.vroToken = null;
      this.vroRefreshToken = null;
      this.vroTokenExpiry = null;
      throw error;
    }
  }

  private async requestVRO<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await this.authenticateVRO();

    const url = `/api/vro${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error: VeeamApiError = {
        message: errorData.error || `VRO API request failed: ${response.status} ${response.statusText}`,
        code: response.status.toString(),
      };
      throw error;
    }

    return response.json();
  }

  async getRecoveryPlans(options?: {
    start?: number;
    limit?: number;
    onlyEnabled?: boolean;
  }): Promise<VRORecoveryPlan[]> {
    try {
      const params = new URLSearchParams();
      if (options?.start !== undefined) params.append('start', options.start.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      if (options?.onlyEnabled !== undefined) params.append('onlyEnabled', options.onlyEnabled.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/plans?${queryString}` : '/plans';

      const response = await this.requestVRO<PlansResult>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching recovery plans:', error);
      throw error;
    }
  }

  async getRecoveryPlanById(id: string): Promise<VRORecoveryPlan> {
    try {
      return await this.requestVRO<VRORecoveryPlan>(`/plans/${id}`);
    } catch (error) {
      console.error(`Error fetching recovery plan ${id}:`, error);
      throw error;
    }
  }

  async logoutVRO(): Promise<void> {
    // Clear local VRO tokens
    this.vroToken = null;
    this.vroRefreshToken = null;
    this.vroTokenExpiry = null;
  }

  // ============================================
  // Veeam Backup for Microsoft 365 (VBM) Methods
  // ============================================

  private async authenticateVBM(): Promise<string> {
    // Use debouncer to prevent multiple simultaneous auth calls
    return this.vbmAuthDebouncer.execute(async () => {
      // Check if token exists and is still valid (with 5 minute buffer)
      if (this.vbmToken && this.vbmTokenExpiry) {
        const now = new Date();
        const bufferMs = 5 * 60 * 1000; // 5 minutes
        if (now.getTime() < this.vbmTokenExpiry.getTime() - bufferMs) {
          return this.vbmToken;
        }

        // Token expired, try to refresh if we have a refresh token
        if (this.vbmRefreshToken) {
          try {
            return await this.refreshVBMAccessToken();
          } catch (error) {
            console.warn('VBM token refresh failed, re-authenticating:', error);
            // Fall through to full authentication
          }
        }
      }

      try {
        const response = await fetch('/api/vbm/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grant_type: 'password' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `VBM authentication failed: ${response.status}`);
        }

        const data: TokenResponse = await response.json();
        this.vbmToken = data.access_token;
        this.vbmRefreshToken = data.refresh_token;

        // Calculate token expiry (expires_in is in seconds)
        this.vbmTokenExpiry = new Date(Date.now() + data.expires_in * 1000);

        return this.vbmToken;
      } catch (error) {
        console.error('VBM authentication error:', error);
        throw error;
      }
    });
  }

  private async refreshVBMAccessToken(): Promise<string> {
    if (!this.vbmRefreshToken) {
      throw new Error('No VBM refresh token available');
    }

    try {
      const response = await fetch('/api/vbm/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.vbmRefreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `VBM token refresh failed: ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      this.vbmToken = data.access_token;
      this.vbmRefreshToken = data.refresh_token;
      this.vbmTokenExpiry = new Date(Date.now() + data.expires_in * 1000);

      return this.vbmToken;
    } catch (error) {
      // Clear tokens on refresh failure
      this.vbmToken = null;
      this.vbmRefreshToken = null;
      this.vbmTokenExpiry = null;
      throw error;
    }
  }

  private async requestVBM<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Use rate limiter to ensure we don't exceed API quota (1 req/sec)
    return this.vbmRateLimiter.execute(async () => {
      const token = await this.authenticateVBM();

      const url = `/api/vbm${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text };
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || `VBM API request failed: ${response.status} ${response.statusText}`;
        // Throw a proper Error object so that calling code (like catch blocks) can access .message
        throw new Error(errorMessage);
      }

      return data as T;
    });
  }

  async getVBMJobs(options?: {
    offset?: number;
    limit?: number;
  }): Promise<VBMJob[]> {
    try {
      const params = new URLSearchParams();
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';

      const response = await this.requestVBM<VBMJobsResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM jobs:', error);
      throw error;
    }
  }

  async startVBMJob(jobId: string): Promise<void> {
    try {
      await this.requestVBM(`/jobs/${jobId}/start`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Error starting VBM job ${jobId}:`, error);
      throw error;
    }
  }

  async stopVBMJob(jobId: string): Promise<void> {
    try {
      await this.requestVBM(`/jobs/${jobId}/stop`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Error stopping VBM job ${jobId}:`, error);
      throw error;
    }
  }

  async enableVBMJob(jobId: string): Promise<void> {
    try {
      await this.requestVBM(`/jobs/${jobId}/enable`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Error enabling VBM job ${jobId}:`, error);
      throw error;
    }
  }

  async disableVBMJob(jobId: string): Promise<void> {
    try {
      await this.requestVBM(`/jobs/${jobId}/disable`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Error disabling VBM job ${jobId}:`, error);
      throw error;
    }
  }

  async getVBMJobSessions(jobId?: string, options?: {
    offset?: number;
    limit?: number;
    endTimeLowerBound?: string;
  }): Promise<VBMJobSession[]> {
    try {
      const params = new URLSearchParams();
      // Use proper server-side filtering with jobId parameter
      if (jobId) params.append('jobId', jobId);
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      if (options?.endTimeLowerBound) params.append('endTimeLowerBound', options.endTimeLowerBound);

      const queryString = params.toString();
      const endpoint = queryString ? `/JobSessions?${queryString}` : '/JobSessions';

      const response = await this.requestVBM<VBMJobSessionsResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error(`Error fetching VBM sessions for job ${jobId}:`, error);
      throw error;
    }
  }

  async getVBMLicense(): Promise<VBMLicense> {
    return this.requestVBM<VBMLicense>('/License')
  }

  async getVBMHealth(): Promise<VBMHealth> {
    return this.requestVBM<VBMHealth>('/Health')
  }

  async getBackups(params: { limit?: number; offset?: number } = {}): Promise<VeeamBackup[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
      if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/backups?${queryString}` : '/backups';
      const response = await this.request<BackupsResult>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching backups:', error);
      return [];
    }
  }



  async getVBMServiceInstance(): Promise<VBMServiceInstance> {
    return this.requestVBM<VBMServiceInstance>('/ServiceInstance')
  }

  async getVBMOrganizations(options?: {
    offset?: number;
    limit?: number;
    extendedView?: boolean;
  }): Promise<VBMOrganization[]> {
    try {
      const params = new URLSearchParams();
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      if (options?.extendedView !== undefined) params.append('extendedView', options.extendedView.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `/Organizations?${queryString}` : '/Organizations';

      const response = await this.requestVBM<VBMOrganizationsResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM organizations:', error);
      throw error;
    }
  }

  async getVBMOrganizationUsedRepositories(orgId: string): Promise<VBMUsedRepository[]> {
    try {
      const response = await this.requestVBM<VBMUsedRepositoriesResponse>(`/Organizations/${orgId}/usedRepositories`);
      return response.results || [];
    } catch (error) {
      console.error(`Error fetching used repositories for org ${orgId}:`, error);
      // Return empty array instead of throwing to prevent dashboard calculation failure from one bad org
      return [];
    }
  }

  async getVBMProtectedUsers(options?: { offset?: number; limit?: number }): Promise<VBMProtectedUser[]> {
    try {
      const params = new URLSearchParams();
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      const queryString = params.toString();
      const endpoint = queryString ? `/ProtectedUsers?${queryString}` : '/ProtectedUsers';
      const response = await this.requestVBM<VBMProtectedUsersResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM protected users:', error);
      return [];
    }
  }

  async getVBMProtectedGroups(options?: { offset?: number; limit?: number }): Promise<VBMProtectedGroup[]> {
    try {
      const params = new URLSearchParams();
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      const queryString = params.toString();
      const endpoint = queryString ? `/ProtectedGroups?${queryString}` : '/ProtectedGroups';
      const response = await this.requestVBM<VBMProtectedGroupsResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM protected groups:', error);
      return [];
    }
  }

  async getVBMProtectedSites(options?: { offset?: number; limit?: number }): Promise<VBMProtectedSite[]> {
    try {
      const params = new URLSearchParams();
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      const queryString = params.toString();
      const endpoint = queryString ? `/ProtectedSites?${queryString}` : '/ProtectedSites';
      const response = await this.requestVBM<VBMProtectedSitesResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM protected sites:', error);
      return [];
    }
  }

  async getVBMProtectedTeams(options?: { offset?: number; limit?: number }): Promise<VBMProtectedTeam[]> {
    try {
      const params = new URLSearchParams();
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      const queryString = params.toString();
      const endpoint = queryString ? `/ProtectedTeams?${queryString}` : '/ProtectedTeams';
      const response = await this.requestVBM<VBMProtectedTeamsResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM protected teams:', error);
      return [];
    }
  }

  async getVBMRestorePoints(params: {
    userId?: string;
    groupId?: string;
    siteId?: string;
    teamId?: string;
    limit?: number;
    offset?: number;
  }): Promise<VBMRestorePoint[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params.userId) searchParams.append('userId', params.userId);
      if (params.groupId) searchParams.append('groupId', params.groupId);
      if (params.siteId) searchParams.append('siteId', params.siteId);
      if (params.teamId) searchParams.append('teamId', params.teamId);
      if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
      if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/RestorePoints?${queryString}` : '/RestorePoints';
      const response = await this.requestVBM<VBMRestorePointsResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM restore points:', error);
      return [];
    }
  }

  async getVBMBackupRepositories(options?: { offset?: number; limit?: number }): Promise<VBMBackupRepository[]> {
    try {
      const params = new URLSearchParams();
      if (options?.offset !== undefined) params.append('offset', options.offset.toString());
      if (options?.limit !== undefined) params.append('limit', options.limit.toString());
      const queryString = params.toString();
      const endpoint = queryString ? `/BackupRepositories?${queryString}` : '/BackupRepositories';
      const response = await this.requestVBM<VBMBackupRepositoriesResponse>(endpoint);
      return response.results || [];
    } catch (error) {
      console.error('Error fetching VBM backup repositories:', error);
      return [];
    }
  }


}

export const veeamApi = new VeeamApiClient();
