import { describe, expect, it, vi } from 'vitest';
import * as controller from '../../server/controller';

// Mock GAS globals
global.Session = {
  getActiveUser: vi.fn().mockReturnValue({
    getEmail: vi.fn().mockReturnValue('viewer@example.com'),
  }),
} as any;

// Mock dependencies
vi.mock('../../server/service/AuthService', () => {
  return {
    AuthService: class {
      requirePermission = vi.fn().mockImplementation((email, _flowId, role) => {
        if (
          email === 'viewer@example.com' &&
          (role === 'EDITOR' || role === 'APPROVER')
        ) {
          throw new Error(`Access Denied: Requires ${role}`);
        }
      });
      getRole = vi.fn();
      getAuthorizedFolderIds = vi.fn();
      getFolderPermissions = vi.fn();
      addFolderPermission = vi.fn();
      removeFolderPermission = vi.fn();
      updateFolderPermission = vi.fn();
      getUserInfo = vi.fn();
    },
  };
});

vi.mock('../../server/service/FlowService', () => {
  return {
    FlowService: class {
      saveDraft = vi.fn();
      approveFlow = vi.fn();
      getFlowList = vi.fn();
      getFlowDetail = vi.fn();
      submitFlow = vi.fn();
      rejectFlow = vi.fn();
      getFlowVersions = vi.fn();
      searchFlows = vi.fn();
    },
  };
});

vi.mock('../../server/service/FolderService', () => {
  return {
    FolderService: class {
      getFolders = vi.fn();
    },
  };
});

// Mock LoggerService
vi.mock('../../server/service/LoggerService', () => {
  return {
    LoggerService: class {
      log = vi.fn();
    },
  };
});

describe('Controller Security Integration', () => {
  it('should deny saveDraft for a user with VIEWER role', () => {
    const payload = {
      flowId: 'f1',
      title: 'Unauthorized Edit',
      graphData: { sheets: [], activeSheetId: '0' },
    };

    expect(() => controller.saveDraft(payload)).toThrow(/Access Denied/);
  });

  it('should deny approveFlow for a user with VIEWER role', () => {
    const payload = {
      flowId: 'f1',
      versionId: 'v1',
      comment: 'Unauthorized Approval',
    };

    expect(() => controller.approveFlow(payload)).toThrow(/Access Denied/);
  });

  it('should deny rejectFlow for a user with VIEWER role', () => {
    const payload = {
      flowId: 'f1',
      versionId: 'v1',
      comment: 'Unauthorized Rejection',
    };

    expect(() => controller.rejectFlow(payload)).toThrow(/Access Denied/);
  });

  it('should deny submitFlow for a user with VIEWER role', () => {
    const payload = {
      flowId: 'f1',
      versionId: 'v1',
      comment: 'Unauthorized Submission',
    };

    expect(() => controller.submitFlow(payload)).toThrow(/Access Denied/);
  });
});
