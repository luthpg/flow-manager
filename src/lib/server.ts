import {
  getPromisedServerScripts,
  type PartialScriptType,
} from '@ciderjs/gasnuki/promise';
import type { ServerScripts } from '~/types/appsscript/client';
import type {
  ApproveFlowResponse,
  FlowDetailResponse,
  FlowListResponse,
  SaveDraftResponse,
  StatusUpdateResponse,
} from '~/types/appsscript/server';
import type { FlowGraphData, FlowVersionSummary } from '~/types/flow';

// --- Helper ---
const mockResponse = <T>(data: T): string =>
  JSON.stringify({ success: true, data });

// --- Mock Data ---
const MOCK_GRAPH_DATA: FlowGraphData = {
  activeSheetId: 'sheet-1',
  sheets: [
    {
      id: 'sheet-1',
      name: 'Main Process',
      nodes: [
        {
          id: '1',
          type: 'bpmnEvent',
          position: { x: 100, y: 100 },
          data: { label: 'Start', eventType: 'start' },
        },
        {
          id: '2',
          type: 'bpmnTask',
          position: { x: 300, y: 100 },
          data: { label: 'Task A' },
        },
      ],
      edges: [{ id: 'e1-2', source: '1', target: '2' }],
    },
    {
      id: 'sheet-2',
      name: 'Sub Process',
      nodes: [],
      edges: [],
    },
  ],
};

const MOCK_VERSIONS: FlowVersionSummary[] = [
  {
    versionId: 'v20231201',
    versionNum: 2,
    status: 'PUBLISHED',
    comment: 'Approved by Manager',
    createdBy: 'admin@example.com',
    createdAt: '2023-12-01T10:00:00Z',
  },
  {
    versionId: 'draft-user-01',
    versionNum: 3,
    status: 'DRAFT',
    comment: 'WIP',
    createdBy: 'user@example.com',
    createdAt: '2023-12-05T14:30:00Z',
  },
];

const mockup: PartialScriptType<ServerScripts> = {
  getFlows: async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const response: FlowListResponse = {
      folders: [
        { id: 'f-1', name: 'Sales Dept' },
        { id: 'f-2', name: 'HR Dept' },
        { id: 'f-3', name: 'IT Infra' },
      ],
      flows: [
        {
          flowId: 'flow-1',
          folderId: 'f-1',
          title: 'Order Processing Flow',
          currentStatus: 'PUBLISHED',
          activeVersionId: 'v20231201',
          updatedAt: '2023-12-01T10:00:00Z',
          versions: MOCK_VERSIONS,
        },
        {
          flowId: 'flow-2',
          folderId: 'f-1',
          title: 'Refund Process',
          currentStatus: 'DRAFT',
          activeVersionId: '',
          updatedAt: '2023-12-05T14:30:00Z',
          versions: [MOCK_VERSIONS[1]],
        },
        {
          flowId: 'flow-3',
          folderId: 'f-2',
          title: 'Hiring Pipeline',
          currentStatus: 'PENDING',
          activeVersionId: 'v1',
          updatedAt: '2023-12-06T09:00:00Z',
          versions: [
            ...MOCK_VERSIONS,
            {
              ...MOCK_VERSIONS[1],
              status: 'PENDING',
              versionId: 'pending-v3',
              comment: 'Request for approval',
            },
          ],
        },
      ],
    };
    return mockResponse(response);
  },

  getFlowData: async (flowId, versionId) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const response: FlowDetailResponse = {
      meta: {
        flowId,
        folderId: 'f-1',
        title: 'Mock Flow Detail',
        currentStatus: 'DRAFT',
        activeVersionId: 'v20231201',
        updatedAt: new Date().toISOString(),
      },
      graphData: MOCK_GRAPH_DATA,
      versionDetail: {
        versionId,
        versionNum: 1,
        status: 'DRAFT',
        comment: 'Mock version detail',
        createdBy: 'user@example.com',
        createdAt: new Date().toISOString(),
      },
      userRole: 'EDITOR',
    };
    return mockResponse(response);
  },

  saveDraft: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const response: SaveDraftResponse = { versionId: `draft-${Date.now()}` };
    return mockResponse(response);
  },

  submitFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const response: StatusUpdateResponse = { status: 'PENDING' };
    return mockResponse(response);
  },

  approveFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const response: ApproveFlowResponse = {
      status: 'PUBLISHED',
      versionId: `rel-${Date.now()}`,
    };
    return mockResponse(response);
  },

  rejectFlow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const response: StatusUpdateResponse = { status: 'REJECTED' };
    return mockResponse(response);
  },

  generateUUID: async () => crypto.randomUUID(),
  getDateString: async () =>
    new Date().toISOString().split('T')[0].replace(/-/g, ''),
  generateDraftVersionId: async () => `draft-mock-${Date.now()}`,
  generateReleaseVersionId: async () => `rel-${Date.now()}`,
  getFolderPermissions: async () => {
    return mockResponse({
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    });
  },
  addFolderPermission: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const response: StatusUpdateResponse = { status: 'PENDING' };
    return mockResponse(response);
  },
};

export const serverScripts = getPromisedServerScripts<ServerScripts>(mockup);
