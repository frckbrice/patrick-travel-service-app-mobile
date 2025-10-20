import { apiClient } from '../api/axios';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    url: string;
  }[];
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

class EmailService {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      logger.info('Sending email', {
        to: options.to,
        subject: options.subject,
      });

      await apiClient.post('/api/email/send', options);

      logger.info('Email sent successfully');
      return true;
    } catch (error: any) {
      logger.error('Failed to send email', error);
      return false;
    }
  }

  async sendContactForm(data: ContactFormData): Promise<boolean> {
    try {
      logger.info('Submitting contact form', { email: data.email });

      await apiClient.post('/contact', data);

      logger.info('Contact form submitted successfully');
      return true;
    } catch (error: any) {
      logger.error('Failed to submit contact form', error);
      return false;
    }
  }

  async sendMessageToAdvisor(
    advisorEmail: string,
    subject: string,
    message: string,
    caseId?: string
  ): Promise<boolean> {
    try {
      const emailOptions: EmailOptions = {
        to: advisorEmail,
        subject: caseId ? `Case #${caseId}: ${subject}` : subject,
        body: message,
      };

      return await this.sendEmail(emailOptions);
    } catch (error) {
      logger.error('Failed to send message to advisor', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
