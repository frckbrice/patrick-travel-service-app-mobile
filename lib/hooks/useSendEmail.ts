import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger';
import { sendEmail as sendEmailAPI } from '../api/email.api';
import type { SendEmailInput, EmailResponse, EmailAttachment } from '../services/email';
import { toast } from '../services/toast';

/**
 * Custom hook for sending emails to advisor
 * 
 * CLIENT ONLY: This hook is for client users to send emails to their assigned advisor
 * 
 * Usage:
 * ```tsx
 * const sendEmail = useSendEmail();
 * 
 * // Send email to advisor via case
 * await sendEmail.mutateAsync({
 *   caseId: 'case-id-123',
 *   subject: 'Question about my case',
 *   content: 'I have a question...',
 *   attachments: [...] // optional
 * });
 * ```
 */
export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendEmailInput): Promise<EmailResponse> => {
      logger.info('useSendEmail: Preparing to send email to advisor', {
        caseId: input.caseId,
        subject: input.subject,
      });

      return sendEmailAPI(input).then((response) => {
        if (!response) {
          throw new Error('Failed to send email');
        }
        return response;
      });
    },
    onSuccess: (data) => {
      logger.info('useSendEmail: Email sent successfully to advisor', {
        messageId: data.data.message.id,
        threadId: data.data.message.threadId,
        recipientName: data.data.message.recipientName,
      });

      // Show success toast
      toast.success({
        title: 'Email Sent',
        message: `Email sent to ${data.data.message.recipientName}`,
      });

      // Invalidate messages query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: Error) => {
      logger.error('useSendEmail: Failed to send email to advisor', error);

      // Show error toast with user-friendly message
      const errorMessage = error.message.includes('Unauthorized')
        ? 'Please login again'
        : error.message.includes('Server error')
        ? 'Email service is temporarily unavailable'
        : 'Failed to send email. Please try again.';

      toast.error({
        title: 'Email Failed',
        message: errorMessage,
      });
    },
  });
}

/**
 * Hook for sending emails to advisor via case (CLIENT ONLY)
 * 
 * @param caseId - Required case ID
 * @returns send function and mutation state
 */
export function useSendEmailToAdvisor(caseId: string) {
  const mutation = useSendEmail();

  const sendToAdvisor = async (
    subject: string,
    content: string,
    attachments?: EmailAttachment[]
  ) => {
    if (!caseId) {
      throw new Error('Case ID is required');
    }

    return mutation.mutateAsync({
      caseId,
      subject,
      content,
      attachments,
    });
  };

  return {
    sendEmail: sendToAdvisor,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
