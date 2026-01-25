import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SHEET_NAMES } from '../../../server/constants';
import { FlowService } from '../../../server/service/FlowService';

// Hoist mock functions so they are available in vi.mock factory
const { mockGetData, mockInsert, mockUpdate } = vi.hoisted(() => {
  return {
    mockGetData: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
  };
});

// Mock Utilities global
global.Utilities = {
  getUuid: vi.fn().mockReturnValue('mock-uuid'),
  formatDate: vi.fn().mockReturnValue('20231115'),
  base64Encode: vi.fn(),
  zip: vi.fn(),
} as any;

// Mock LockService global
global.LockService = {
  getScriptLock: vi.fn().mockReturnValue({
    waitLock: vi.fn(),
    releaseLock: vi.fn(),
  }),
} as any;

// Mock dependencies
vi.mock('../../../server/repository/SheetDB', () => {
  return {
    SheetDB: class {
      getData = mockGetData;
      insert = mockInsert;
      update = mockUpdate;
    },
  };
});

vi.mock('../../../server/service/AuthService', () => {
  return {
    AuthService: class {
      getAuthorizedFolderIds = vi.fn();
      getRole = vi.fn();
    },
  };
});

vi.mock('../../../server/service/LoggerService', () => {
  return {
    LoggerService: class {
      log = vi.fn();
    },
  };
});

describe('FlowService', () => {
  let service: FlowService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FlowService();
  });

  describe('approveFlow', () => {
    it('should implement non-destructive merge: create new published version and mark draft as MERGED', () => {
      // Setup data
      const flowId = 'flow-1';
      const draftVersionId = 'draft-user-123';
      const approverEmail = 'approver@example.com';
      const comment = 'Looks good';

      // Mock Versions
      const versions = [
        {
          versionId: draftVersionId,
          flowId,
          status: 'PENDING',
          versionNum: 1,
          comment: 'Please check',
          jsonData: '{}',
          createdAt: new Date().toISOString(),
        },
        {
          versionId: 'v-old-1',
          flowId,
          status: 'PUBLISHED',
          versionNum: 0,
          jsonData: '{}',
          createdAt: new Date().toISOString(),
        },
      ];

      mockGetData.mockReturnValue(versions);

      // Execute
      const result = service.approveFlow(
        flowId,
        draftVersionId,
        approverEmail,
        comment,
      );

      // Verify

      // 1. Check if a NEW version was inserted (Published)
      expect(mockInsert).toHaveBeenCalledWith(
        SHEET_NAMES.FLOW_VERSIONS,
        expect.objectContaining({
          flowId: flowId,
          status: 'PUBLISHED',
        }),
      );

      // 2. Check if the ORIGINAL draft was updated to MERGED
      expect(mockUpdate).toHaveBeenCalledWith(
        SHEET_NAMES.FLOW_VERSIONS,
        'versionId',
        draftVersionId,
        expect.objectContaining({
          status: 'MERGED',
        }),
      );

      // 3. Check if Flow Parent Meta was updated
      expect(mockUpdate).toHaveBeenCalledWith(
        SHEET_NAMES.FLOWS,
        'flowId',
        flowId,
        expect.objectContaining({
          currentStatus: 'PUBLISHED',
          activeVersionId: result,
        }),
      );
    });
  });
});
