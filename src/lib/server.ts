import { serialize } from '@ciderjs/gasnuki/json';
import {
  getPromisedServerScripts,
  type PartialScriptType,
} from '@ciderjs/gasnuki/promise';
import type {
  LogAction,
  PermissionRow,
  ServerScripts,
} from '~/types/appsscript/client';
import type { FlowMeta, FlowVersionDetail, Folder } from '~/types/flow';

// mockData.ts
export const mockFlows: FlowMeta[] = [
  {
    flowId: '1',
    folderId: '1',
    versionId: '1',
    activeVersionId: '1',
    title: 'Sales Process Flow',
    currentStatus: 'PUBLISHED',
    updatedAt: '2023-11-15T10:00:00Z',
  },
  {
    flowId: '2',
    folderId: '1',
    versionId: '1',
    activeVersionId: '1',
    title: 'Sales Pro Flow',
    currentStatus: 'PUBLISHED',
    updatedAt: '2023-11-14T14:30:00Z',
  },
  {
    flowId: '3',
    folderId: '2',
    versionId: 'draft-test-20250101',
    activeVersionId: '1',
    title: 'Inventory Check',
    currentStatus: 'PENDING',
    updatedAt: '2023-11-14T09:15:00Z',
  },
  {
    flowId: '4',
    folderId: '3',
    versionId: '2',
    activeVersionId: '2',
    title: 'Inventory Check v2',
    currentStatus: 'PUBLISHED',
    updatedAt: '2023-11-13T11:20:00Z',
  },
  {
    flowId: '5',
    folderId: '4',
    versionId: 'draft-test-20250101',
    activeVersionId: '1',
    title: 'Estata Check Flow',
    currentStatus: 'DRAFT',
    updatedAt: '2023-11-12T16:45:00Z',
  },
  {
    flowId: '6',
    folderId: '4',
    versionId: 'draft-test-20250101',
    activeVersionId: '1',
    title: 'Customers Flow',
    currentStatus: 'DRAFT',
    updatedAt: '2023-11-10T08:00:00Z',
  },
];

export const mockFolders: Folder[] = [
  { folderId: '1', name: 'Sales Department' },
  { folderId: '2', name: 'Inventory Management' },
  { folderId: '3', name: 'HR & Legal' },
  { folderId: '4', name: 'Archive' },
];

export const mockVersions: FlowVersionDetail[] = [
  {
    versionId: '1',
    versionNum: 1,
    status: 'PUBLISHED',
    comment: 'Initial Draft',
    createdBy: 'user@example.com',
    createdAt: '2023-11-15T10:00:00Z',
  },
  {
    versionId: '2',
    versionNum: 2,
    status: 'PUBLISHED',
    comment: 'Initial Draft',
    createdBy: 'user@example.com',
    createdAt: '2023-11-15T10:00:00Z',
  },
];

export const mockPermissions: (PermissionRow & {
  avatarUrl?: string | undefined;
})[] = [
  {
    permissionId: 'p1',
    folderId: '1',
    subjectEmail: 'user@example.com',
    role: 'ADMIN',
    avatarUrl: 'https://github.com/shadcn.png',
  },
  {
    permissionId: 'p2',
    folderId: '1',
    subjectEmail: 'colleague@example.com',
    role: 'VIEWER',
  },
];

// mockup function to simulate as fetching appsscript time
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const mockup: PartialScriptType<ServerScripts> = {
  getFlows: async () => {
    await sleep(800);
    return serialize(mockFlows);
  },

  getFolders: async () => {
    await sleep(500);
    return serialize(mockFolders);
  },

  getFolderPermissions: async (folderId) => {
    await sleep(600);
    return serialize(mockPermissions.filter((p) => p.folderId === folderId));
  },

  createFlow: async (_payload) => {
    await sleep(800);
    return serialize({
      flowId: `new-flow-${Date.now()}`,
      versionId: 'draft-test-20250101',
    });
  },

  addFolderPermission: async (folderId, email, role) => {
    await sleep(800);
    const newPerm: PermissionRow & {
      avatarUrl?: string | undefined;
    } = {
      permissionId: `p-${Date.now()}`,
      folderId,
      subjectEmail: email,
      role,
    };
    mockPermissions.push(newPerm);
    return serialize(newPerm);
  },

  removeFolderPermission: async (permissionId) => {
    await sleep(600);
    const idx = mockPermissions.findIndex(
      (p) => p.permissionId === permissionId,
    );
    if (idx !== -1) mockPermissions.splice(idx, 1);
    return serialize({ success: true, permissionId });
  },

  updateFolderPermission: async (permissionId, role) => {
    await sleep(600);
    const perm = mockPermissions.find((p) => p.permissionId === permissionId);
    if (!perm) {
      throw Error(`Permission ${permissionId} not found`);
    }
    perm.role = role;
    return serialize(perm);
  },

  getFlowVersions: async (_flowId) => {
    await sleep(600);
    // For demo purposes, return same versions for all flows
    return serialize(mockVersions);
  },

  searchFlows: async (query) => {
    await sleep(800);
    const lowerQuery = query.toLowerCase();
    const results = mockFlows.filter(
      (f) =>
        f.title.toLowerCase().includes(lowerQuery) ||
        f.currentStatus.toLowerCase().includes(lowerQuery),
    );
    return serialize(results);
  },

  getFlowData: async (flowId, versionId) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return serialize({
      userRole: 'ADMIN',
      meta: {
        flowId,
        versionId,
        activeVersionId: versionId,
        folderId: 'd65h7ae6',
        title: 'Mock Flow',
        currentStatus: 'DRAFT',
        updatedAt: new Date().toISOString(),
      },
      version: {
        versionId: versionId,
        versionNum: 1,
        status: 'DRAFT',
        comment: 'Initial Draft',
        createdBy: 'user@example.com',
        createdAt: new Date().toISOString(),
      },
      graphData: {
        activeSheetId: '0',
        sheets: [],
      },
    });
  },

  saveDraft: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Mock: Draft Saved');
    return serialize({ versionId: 'v-new-123' });
  },

  submitFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return serialize({ status: 'PENDING' });
  },

  approveFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return serialize({ status: 'PUBLISHED', versionId: 'v-new-123' });
  },

  rejectFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return serialize({ status: 'REJECTED' });
  },

  getSystemLogs: async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return serialize([
      {
        logId: 'log-1',
        timestamp: new Date().toISOString(),
        action: 'APPROVE_FLOW' as LogAction,
        actor: 'admin@example.com',
        targetId: 'flow-1',
        details: 'Approved v1',
      },
      {
        logId: 'log-2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: 'SUBMIT_FLOW' as LogAction,
        actor: 'user@example.com',
        targetId: 'flow-1',
        details: 'Submitted for review',
      },
    ]);
  },

  forceUnlock: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('Mock: Force Unlock');
    return serialize({ success: true });
  },
};

export const serverScripts = getPromisedServerScripts<ServerScripts>({
  mockupFunctions: mockup,
  parseJson: true,
});
