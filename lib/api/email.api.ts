import { apiClient } from './axios';
import { logger } from '../utils/logger';
import type { SendEmailInput, EmailResponse, EmailAttachment } from '../services/email';

/**
 * Email API functions for sending emails via backend
 * 
 * Endpoint: POST /api/emails/send
 * 
 * CLIENT ONLY: This mobile app is for client users only.
 * Clients send emails to their assigned advisor via caseId
 * The backend auto-resolves the recipient (advisor) from the case
 */

/**
 * Send email to advisor via the backend API
 * 
 * @param input - SendEmailInput object with email details
 * @returns EmailResponse with message details or null on failure
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailResponse | null> {
  try {
    logger.info('Sending email to advisor via API', {
      caseId: input.caseId,
      subject: input.subject,
      hasAttachments: !!input.attachments?.length,
    });

    const response = await apiClient.post<EmailResponse>('/api/emails/send', {
      caseId: input.caseId,
      subject: input.subject,
      content: input.content,
      attachments: input.attachments,
    });

    logger.info('Email sent successfully to advisor', {
      messageId: response.data.data.message.id,
      threadId: response.data.data.message.threadId,
      recipientName: response.data.data.message.recipientName,
    });

    return response.data;
  } catch (error: any) {
    logger.error('Failed to send email', {
      error: error.message,
      status: error.response?.status,
      response: error.response?.data,
    });

    // Handle specific error cases
    if (error.response?.status === 400) {
      logger.error('Validation error:', error.response.data.error);
      throw new Error(`Validation error: ${error.response.data.error}`);
    } else if (error.response?.status === 401) {
      logger.error('Unauthorized - check authentication token');
      throw new Error('Unauthorized - please login again');
    } else if (error.response?.status === 403) {
      logger.error('Forbidden - unauthorized access to case');
      throw new Error('Unauthorized access to case');
    } else if (error.response?.status === 404) {
      logger.error('Resource not found:', error.response.data.error);
      throw new Error(`Resource not found: ${error.response.data.error}`);
    } else if (error.response?.status === 500) {
      logger.error('Server error - support email not configured');
      throw new Error('Server error - email service is temporarily unavailable');
    }

    throw error;
  }
}

/**
 * Send contact form (for general inquiries)
 * This may use a different endpoint or the general email endpoint
 * 
 * @param data - Contact form data
 * @returns boolean indicating success
 */
export async function sendContactForm(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<boolean> {
  try {
    logger.info('Submitting contact form', { email: data.email });

    await apiClient.post('/contact', data);

    logger.info('Contact form submitted successfully');
    return true;
  } catch (error: any) {
    logger.error('Failed to submit contact form', {
      error: error.message,
      response: error.response?.data,
    });
    return false;
  }
}

/**
 * Helper function to convert document to email attachment
 * 
 * @param document - Document object with url, name, size, type
 * @returns EmailAttachment object
 */
export function documentToAttachment(document: {
  url: string;
  name: string;
  size?: number;
  type?: string;
  id?: string;
}): EmailAttachment {
  return {
    id: document.id,
    url: document.url,
    name: document.name,
    size: document.size || 0,
    type: document.type || 'application/octet-stream',
  };
}

// Export types for convenience
export type { SendEmailInput, EmailResponse, EmailAttachment } from '../services/email';
