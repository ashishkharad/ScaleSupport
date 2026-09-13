import {
  CommissionRule,
  UserCommissionAssignment,
  CommissionCalculationResult,
  Account,
  QDType,
  RecoveryStage,
} from '../types';

/**
 * Checks if a date string YYYY-MM-DD falls within [effectiveFrom, effectiveTo] inclusive.
 */
export function isDateWithinRange(dateStr: string, effectiveFrom: string, effectiveTo?: string): boolean {
  if (!dateStr) return true;
  const target = dateStr.slice(0, 10);
  if (effectiveFrom && target < effectiveFrom.slice(0, 10)) {
    return false;
  }
  if (effectiveTo && effectiveTo.trim() && target > effectiveTo.slice(0, 10)) {
    return false;
  }
  return true;
}

export interface CalculationParams {
  eligibleAmount: number;
  recoveryDate: string; // YYYY-MM-DD
  agentId?: string; // e.g. RA-0045 or USR-AGENT-1
  bankName?: string;
  zoneName?: string;
  departmentName?: string;
  branchName?: string;
  qdType?: QDType;
  recoveryStage?: RecoveryStage;
  account?: Account | null;
}

/**
 * Executes prioritized commission rule lookup with conflict detection.
 * Priority hierarchy:
 * 1. User/agent-specific assignment / override
 * 2. Bank + zone + branch + QD type
 * 3. Bank + zone + QD type
 * 4. Bank + zone
 * 5. Bank default
 * 
 * If equal-priority active rules overlap, returns conflict error:
 * "Duplicate commission rule detected. Please resolve the conflicting commission rules."
 */
export function calculateCommissionWithPriority(
  params: CalculationParams,
  commissionRules: CommissionRule[],
  userAssignments: UserCommissionAssignment[],
  defaultFallbackRate = 10.0
): CommissionCalculationResult {
  const {
    eligibleAmount,
    recoveryDate,
    agentId,
    bankName,
    zoneName,
    branchName,
    qdType,
    recoveryStage,
  } = params;

  const validRecoveryDate = recoveryDate || new Date().toISOString().slice(0, 10);

  // 1. PRIORITY 1: User / Agent specific assignment
  if (agentId) {
    const matchingAssignments = userAssignments.filter((a) => {
      if (a.status !== 'active') return false;
      if (a.agentId !== agentId && a.agentName !== agentId) return false;
      return isDateWithinRange(validRecoveryDate, a.effectiveFrom, a.effectiveTo);
    });

    if (matchingAssignments.length > 1) {
      return {
        success: false,
        percentage: 0,
        commissionAmount: 0,
        priorityLevel: 1,
        priorityDescription: 'Priority 1: User/Agent Specific Assignment',
        conflictDetected: true,
        error: 'Duplicate commission rule detected. Please resolve the conflicting commission rules.',
      };
    }

    if (matchingAssignments.length === 1) {
      const assignment = matchingAssignments[0];
      let pct = assignment.percentageOverride;

      if (pct === undefined && assignment.ruleId) {
        const linkedRule = commissionRules.find((r) => r.id === assignment.ruleId && r.status === 'active');
        if (linkedRule) pct = linkedRule.commissionPercentage;
      }

      if (pct !== undefined && !isNaN(pct) && pct >= 0 && pct <= 100) {
        const amount = Math.round((eligibleAmount * pct) / 100);
        return {
          success: true,
          percentage: pct,
          commissionAmount: amount,
          assignmentId: assignment.id,
          ruleName: `Agent Specific: ${assignment.agentName} (${assignment.assignmentCode})`,
          priorityLevel: 1,
          priorityDescription: 'Priority 1: User/Agent Specific Rule Override',
        };
      }
    }
  }

  // Active rules matching effective date
  const activeRules = commissionRules.filter((r) => {
    if (r.status !== 'active') return false;
    return isDateWithinRange(validRecoveryDate, r.effectiveFrom, r.effectiveTo);
  });

  // Helper to match QD Type
  const matchQD = (ruleQD?: string, targetQD?: string) => {
    if (!ruleQD || ruleQD === 'All QDs' || ruleQD === 'ALL') return true;
    if (!targetQD) return false;
    return ruleQD.trim().toLowerCase() === targetQD.trim().toLowerCase();
  };

  // Helper to match Stage
  const matchStage = (ruleStage?: string, targetStage?: string) => {
    if (!ruleStage || ruleStage === 'All Stages' || ruleStage === 'ALL') return true;
    if (!targetStage) return false;
    return ruleStage.trim().toLowerCase() === targetStage.trim().toLowerCase();
  };

  // 2. PRIORITY 2: Bank + Zone + Branch + QD Type
  if (bankName && zoneName && branchName && qdType) {
    const p2Rules = activeRules.filter((r) => {
      const bMatch = r.bankName?.trim().toLowerCase() === bankName.trim().toLowerCase();
      const zMatch = r.zoneName?.trim().toLowerCase() === zoneName.trim().toLowerCase();
      const brMatch = r.branchName?.trim().toLowerCase() === branchName.trim().toLowerCase();
      const qMatch = r.qdType && matchQD(r.qdType, qdType);
      const stMatch = matchStage(r.recoveryStage, recoveryStage);
      return bMatch && zMatch && brMatch && qMatch && stMatch;
    });

    if (p2Rules.length > 1) {
      return {
        success: false,
        percentage: 0,
        commissionAmount: 0,
        priorityLevel: 2,
        priorityDescription: 'Priority 2: Bank + Zone + Branch + QD Type',
        conflictDetected: true,
        conflictingRules: p2Rules,
        error: 'Duplicate commission rule detected. Please resolve the conflicting commission rules.',
      };
    }

    if (p2Rules.length === 1) {
      const r = p2Rules[0];
      const amount = Math.round((eligibleAmount * r.commissionPercentage) / 100);
      return {
        success: true,
        percentage: r.commissionPercentage,
        commissionAmount: amount,
        ruleId: r.id,
        ruleName: r.name,
        priorityLevel: 2,
        priorityDescription: 'Priority 2: Bank + Zone + Branch + QD Type Rule',
      };
    }
  }

  // 3. PRIORITY 3: Bank + Zone + QD Type
  if (bankName && zoneName && qdType) {
    const p3Rules = activeRules.filter((r) => {
      const bMatch = r.bankName?.trim().toLowerCase() === bankName.trim().toLowerCase();
      const zMatch = r.zoneName?.trim().toLowerCase() === zoneName.trim().toLowerCase();
      const qMatch = r.qdType && matchQD(r.qdType, qdType);
      const stMatch = matchStage(r.recoveryStage, recoveryStage);
      const noBranch = !r.branchName || r.branchName === 'ALL' || r.branchName === 'All Branches';
      return bMatch && zMatch && qMatch && stMatch && noBranch;
    });

    if (p3Rules.length > 1) {
      return {
        success: false,
        percentage: 0,
        commissionAmount: 0,
        priorityLevel: 3,
        priorityDescription: 'Priority 3: Bank + Zone + QD Type',
        conflictDetected: true,
        conflictingRules: p3Rules,
        error: 'Duplicate commission rule detected. Please resolve the conflicting commission rules.',
      };
    }

    if (p3Rules.length === 1) {
      const r = p3Rules[0];
      const amount = Math.round((eligibleAmount * r.commissionPercentage) / 100);
      return {
        success: true,
        percentage: r.commissionPercentage,
        commissionAmount: amount,
        ruleId: r.id,
        ruleName: r.name,
        priorityLevel: 3,
        priorityDescription: 'Priority 3: Bank + Zone + QD Type Rule',
      };
    }
  }

  // 4. PRIORITY 4: Bank + Zone
  if (bankName && zoneName) {
    const p4Rules = activeRules.filter((r) => {
      const bMatch = r.bankName?.trim().toLowerCase() === bankName.trim().toLowerCase();
      const zMatch = r.zoneName?.trim().toLowerCase() === zoneName.trim().toLowerCase();
      const noQD = !r.qdType || r.qdType === 'All QDs' || r.qdType === 'ALL';
      const noBranch = !r.branchName || r.branchName === 'ALL' || r.branchName === 'All Branches';
      return bMatch && zMatch && noQD && noBranch;
    });

    if (p4Rules.length > 1) {
      return {
        success: false,
        percentage: 0,
        commissionAmount: 0,
        priorityLevel: 4,
        priorityDescription: 'Priority 4: Bank + Zone',
        conflictDetected: true,
        conflictingRules: p4Rules,
        error: 'Duplicate commission rule detected. Please resolve the conflicting commission rules.',
      };
    }

    if (p4Rules.length === 1) {
      const r = p4Rules[0];
      const amount = Math.round((eligibleAmount * r.commissionPercentage) / 100);
      return {
        success: true,
        percentage: r.commissionPercentage,
        commissionAmount: amount,
        ruleId: r.id,
        ruleName: r.name,
        priorityLevel: 4,
        priorityDescription: 'Priority 4: Bank + Zone Default Rule',
      };
    }
  }

  // 5. PRIORITY 5: Bank Default
  if (bankName) {
    const p5Rules = activeRules.filter((r) => {
      const bMatch = r.bankName?.trim().toLowerCase() === bankName.trim().toLowerCase();
      const noZone = !r.zoneName || r.zoneName === 'ALL' || r.zoneName === 'All Zones';
      const noQD = !r.qdType || r.qdType === 'All QDs' || r.qdType === 'ALL';
      const noBranch = !r.branchName || r.branchName === 'ALL' || r.branchName === 'All Branches';
      return bMatch && noZone && noQD && noBranch;
    });

    if (p5Rules.length > 1) {
      return {
        success: false,
        percentage: 0,
        commissionAmount: 0,
        priorityLevel: 5,
        priorityDescription: 'Priority 5: Bank Default',
        conflictDetected: true,
        conflictingRules: p5Rules,
        error: 'Duplicate commission rule detected. Please resolve the conflicting commission rules.',
      };
    }

    if (p5Rules.length === 1) {
      const r = p5Rules[0];
      const amount = Math.round((eligibleAmount * r.commissionPercentage) / 100);
      return {
        success: true,
        percentage: r.commissionPercentage,
        commissionAmount: amount,
        ruleId: r.id,
        ruleName: r.name,
        priorityLevel: 5,
        priorityDescription: 'Priority 5: Bank Base Default Rule',
      };
    }
  }

  // Fallback to system standard default rate
  const fallbackAmount = Math.round((eligibleAmount * defaultFallbackRate) / 100);
  return {
    success: true,
    percentage: defaultFallbackRate,
    commissionAmount: fallbackAmount,
    priorityLevel: 5,
    priorityDescription: 'System Default Standard Rate',
    ruleName: `Standard Rate (${defaultFallbackRate}%)`,
  };
}
