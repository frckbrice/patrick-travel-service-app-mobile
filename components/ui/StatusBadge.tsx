/**
 * Status Badge Component
 * Specialized badge for case and document status
 */

import React from 'react';
import { Badge, BadgeVariant } from './Badge';
import { CaseStatus, DocumentStatus } from '../../lib/types';

interface StatusBadgeProps {
  status: CaseStatus | DocumentStatus;
}

const getCaseStatusConfig = (status: CaseStatus): { label: string; variant: BadgeVariant } => {
  switch (status) {
    case 'SUBMITTED':
      return { label: 'Submitted', variant: 'info' };
    case 'UNDER_REVIEW':
      return { label: 'Under Review', variant: 'warning' };
    case 'DOCUMENTS_REQUIRED':
      return { label: 'Docs Required', variant: 'danger' };
    case 'PROCESSING':
      return { label: 'Processing', variant: 'primary' };
    case 'APPROVED':
      return { label: 'Approved', variant: 'success' };
    case 'REJECTED':
      return { label: 'Rejected', variant: 'danger' };
    case 'CLOSED':
      return { label: 'Closed', variant: 'secondary' };
    default:
      return { label: status, variant: 'secondary' };
  }
};

const getDocumentStatusConfig = (status: DocumentStatus): { label: string; variant: BadgeVariant } => {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', variant: 'warning' };
    case 'APPROVED':
      return { label: 'Approved', variant: 'success' };
    case 'REJECTED':
      return { label: 'Rejected', variant: 'danger' };
    default:
      return { label: status, variant: 'secondary' };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Determine if it's a case or document status
  const isCaseStatus = ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'PROCESSING', 'APPROVED', 'REJECTED', 'CLOSED'].includes(status);
  
  const config = isCaseStatus
    ? getCaseStatusConfig(status as CaseStatus)
    : getDocumentStatusConfig(status as DocumentStatus);

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
};

