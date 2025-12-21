import {
  getPromisedServerScripts,
  type PartialScriptType,
} from '@ciderjs/gasnuki/promise';
import type { ServerScripts } from '~/types/appsscript/client';
import type {
  FlowData,
  FlowMeta,
  FlowVersion,
  Folder,
  FolderPermission,
} from '~/types/flow';

// --- Mock Data Generators (for Local Development) ---
const mockResponse = <T>(data: T): string =>
  JSON.stringify({ success: true, data });

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

export const mockVersions: FlowVersion[] = [
  {
    versionId: 'v2',
    versionNum: 2,
    status: 'PUBLISHED',
    createdAt: '2023-11-13T11:20:00Z',
  },
  {
    versionId: 'v1',
    versionNum: 1,
    status: 'PUBLISHED',
    createdAt: '2023-11-01T09:00:00Z',
  },
];

export const mockPermissions: FolderPermission[] = [
  {
    permissionId: 'p1',
    folderId: '1',
    email: 'user@example.com',
    role: 'OWNER',
    avatarUrl: 'https://github.com/shadcn.png',
  },
  {
    permissionId: 'p2',
    folderId: '1',
    email: 'colleague@example.com',
    role: 'VIEWER',
  },
];

// mockup function to simulate as fetching appsscript time
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const mockup: PartialScriptType<ServerScripts> = {
  getFlows: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800)); // 疑似遅延
    return mockResponse(mockFlows);
  },

  getFolders: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockResponse(mockFolders);
  },

  getFolderPermissions: async (folderId) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return mockResponse(mockPermissions.filter((p) => p.folderId === folderId));
  },

  addFolderPermission: async (folderId, email, role) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newPerm: FolderPermission = {
      permissionId: `p-${Date.now()}`,
      folderId,
      email,
      role: role as any,
    };
    mockPermissions.push(newPerm);
    return mockResponse(newPerm);
  },

  removeFolderPermission: async (permissionId) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const idx = mockPermissions.findIndex(
      (p) => p.permissionId === permissionId,
    );
    if (idx !== -1) mockPermissions.splice(idx, 1);
    return mockResponse({ success: true });
  },

  updateFolderPermission: async (permissionId, role) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const perm = mockPermissions.find((p) => p.permissionId === permissionId);
    if (perm) {
      perm.role = role as any;
    }
    return mockResponse(perm);
  },

  getFlowVersions: async (_flowId) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    // For demo purposes, return same versions for all flows
    return mockResponse(mockVersions);
  },

  searchFlows: async (query) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const lowerQuery = query.toLowerCase();
    const results = mockFlows.filter(
      (f) =>
        f.title.toLowerCase().includes(lowerQuery) ||
        f.currentStatus.toLowerCase().includes(lowerQuery),
    );
    return mockResponse(results);
  },

  getFlowData: async (flowId, versionId) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockResponse<FlowData>({
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
    return mockResponse({ versionId: 'v-new-123' });
  },

  submitFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return mockResponse({ status: 'PENDING' });
  },

  approveFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return mockResponse({ status: 'PUBLISHED' });
  },

  rejectFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return mockResponse({ status: 'REJECTED' });
  },
};

export const serverScripts = getPromisedServerScripts<ServerScripts>(mockup);
