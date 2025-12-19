import {
  getPromisedServerScripts,
  type PartialScriptType,
} from '@ciderjs/gasnuki/promise';
import type { ServerScripts } from '~/types/appsscript/client';
import type { FlowData, FlowMeta } from '~/types/flow';

// --- Mock Data Generators (for Local Development) ---
const mockResponse = <T>(data: T): string =>
  JSON.stringify({ success: true, data });
const mockError = (msg: string): string =>
  JSON.stringify({
    success: false,
    error: msg,
  });

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

// mockup function to simulate as fetching appsscript time
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const mockup: PartialScriptType<ServerScripts> = {
  getFlows: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800)); // 疑似遅延
    return mockResponse(mockFlows);
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
      graphData: {
        activeSheetId: '0',
        sheets: [],
      },
      // graphData: {
      //   activeSheetId: 'tsater',
      //   sheets: [
      //     {
      //       id: 'tsater',
      //       name: 'Mock Flow Sheet',
      //       nodes: [],
      //       edges: [],
      //     },
      //   ],
      // },
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
