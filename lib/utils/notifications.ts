import { format, isToday, isYesterday } from 'date-fns';
import { NotificationType } from '../types';
import { Conversation } from '../services/chat';

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getConversationTitle(
  item: Conversation,
  userRole?: string,
  t?: (key: string) => string | undefined
): string {
  if (item.participants.agentName && userRole === 'CLIENT') {
    return item.participants.agentName;
  }
  if (item.participants.clientName && userRole !== 'CLIENT') {
    return item.participants.clientName;
  }
  return (
    item.caseReference?.substring(0, 20) +
    (item.caseReference?.length && item.caseReference.length > 20 ? '...' : '') ||
    'Case'
  );
}

export function getNotificationBadgeColor(type: NotificationType): string {
  switch (type) {
    case NotificationType.CASE_STATUS_UPDATE:
      return '#3B82F6';
    case NotificationType.NEW_MESSAGE:
      return '#10B981';
    case NotificationType.NEW_EMAIL:
      return '#F59E0B';
    case NotificationType.DOCUMENT_UPLOADED:
      return '#8B5CF6';
    case NotificationType.DOCUMENT_VERIFIED:
      return '#10B981';
    case NotificationType.DOCUMENT_REJECTED:
      return '#EF4444';
    case NotificationType.CASE_ASSIGNED:
      return '#06B6D4';
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return '#6B7280';
    default:
      return '#2B6CB0';
  }
}

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.CASE_STATUS_UPDATE:
      return 'file-document-edit';
    case NotificationType.NEW_MESSAGE:
      return 'message-text';
    case NotificationType.NEW_EMAIL:
      return 'email';
    case NotificationType.DOCUMENT_UPLOADED:
      return 'upload';
    case NotificationType.DOCUMENT_VERIFIED:
      return 'check-circle';
    case NotificationType.DOCUMENT_REJECTED:
      return 'close-circle';
    case NotificationType.CASE_ASSIGNED:
      return 'account-plus';
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return 'bullhorn';
    default:
      return 'bell';
  }
}

export function getNotificationPriority(type: NotificationType): 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' {
  switch (type) {
    case NotificationType.DOCUMENT_REJECTED:
    case NotificationType.CASE_STATUS_UPDATE:
      return 'URGENT';
    case NotificationType.NEW_MESSAGE:
    case NotificationType.NEW_EMAIL:
      return 'HIGH';
    case NotificationType.DOCUMENT_UPLOADED:
    case NotificationType.DOCUMENT_VERIFIED:
      return 'NORMAL';
    default:
      return 'LOW';
  }
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (new Date().getTime() - timestamp < 7 * 24 * 60 * 60 * 1000) {
    return format(date, 'EEE');
  } else {
    return format(date, 'MMM d');
  }
}

export function formatEmailDate(date: Date, t?: (key: string) => string | undefined): string {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return (t && (t('email.yesterday') || 'Yesterday')) || 'Yesterday';
  return format(d, 'MMM d, yyyy');
}


