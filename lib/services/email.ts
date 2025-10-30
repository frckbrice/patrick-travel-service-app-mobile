import { apiClient } from '../api/axios';
import { logger } from '../utils/logger';

/**
 * Email attachment interface matching backend API
 */
export interface EmailAttachment {
  id?: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * SendEmailInput interface matching backend API
 * CLIENT ONLY: caseId is required, recipientId is auto-resolved from case's assigned agent
 * This app is for CLIENT users only - they send emails to their assigned advisor
 */
export interface SendEmailInput {
  caseId: string;          // REQUIRED - Client must specify case ID
  subject: string;         // Required
  content: string;         // Required
  attachments?: EmailAttachment[]; // Optional
}

/**
 * Email API response interface
 */
export interface EmailResponse {
  success: boolean;
  data: {
    message: {
      id: string;              // Message UUID
      subject: string;          // Email subject
      recipientName: string;   // Full name of recipient
      sentAt: string;          // ISO timestamp
      threadId: string;        // Unique email thread identifier
    };
  };
  message: string;
}

/**
 * Contact form data interface
 * Used for general contact support inquiries
 */
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/**
 * Legacy email options interface (deprecated, kept for backward compatibility)
 * @deprecated Use SendEmailInput instead
 */
export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    url: string;
  }[];
}

class EmailService {
  /**
   * Send email to advisor via the backend API
   * Endpoint: POST /api/emails/send
   * 
   * CLIENT ONLY: Client sends email to their assigned advisor
   * The recipientId is auto-resolved from the case's assigned agent
   * 
   * @param input - SendEmailInput object with email details
   * @returns EmailResponse with message details
   */
  async sendEmail(input: SendEmailInput): Promise<EmailResponse | null> {
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

      logger.info('Email sent successfully', {
        messageId: response.data.data.message.id,
        threadId: response.data.data.message.threadId,
        recipientName: response.data.data.message.recipientName,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to send email', {
        error: error.message,
        response: error.response?.data,
      });

      // Handle specific error cases
      if (error.response?.status === 400) {
        logger.error('Validation error:', error.response.data.error);
      } else if (error.response?.status === 401) {
        logger.error('Unauthorized - check authentication token');
      } else if (error.response?.status === 403) {
        logger.error('Forbidden - unauthorized access to case');
      } else if (error.response?.status === 404) {
        logger.error('Resource not found:', error.response.data.error);
      } else if (error.response?.status === 500) {
        logger.error('Server error - support email not configured');
      }

      return null;
    }
  }

  /**
   * Send contact form submission
   * This is a legacy method for general contact inquiries
   * 
   * @param data - ContactFormData object with form details
   * @returns boolean indicating success
   */
  async sendContactForm(data: ContactFormData): Promise<boolean> {
    try {
      logger.info('Submitting contact form', { email: data.email, data });

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
   * Send message to advisor (CLIENT role)
   * Requires caseId to auto-resolve the recipient
   * 
   * @param caseId - Required case ID for CLIENT
   * @param subject - Email subject
   * @param message - Email content
   * @param attachments - Optional attachments
   * @returns EmailResponse with message details
   */
  async sendMessageToAdvisor(
    caseId: string,
    subject: string,
    message: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailResponse | null> {
    try {
      logger.info('Sending message to advisor', { caseId, subject });

      return await this.sendEmail({
        caseId,
        subject,
        content: message,
        attachments,
      });
    } catch (error) {
      logger.error('Failed to send message to advisor', error);
      return null;
    }
  }

}

export const emailService = new EmailService();
