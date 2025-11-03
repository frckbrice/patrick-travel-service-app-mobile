import { useCasesStore } from '../../stores/cases/casesStore';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from '../utils/alert';

export const useCaseRequirementGuard = () => {
    const cases = useCasesStore((s) => s.cases);
    const router = useRouter();
    const { t } = useTranslation();

    const activeCases = cases.filter(
        (c) => c.status !== 'CLOSED' && c.status !== 'REJECTED'
    );

    const requiresActiveCase = (action: string, onNavigateToNewCase?: () => void): boolean => {
        if (activeCases.length === 0) {
            Alert.alert(
                t('common.noActiveCase') || 'No Active Case',
                t('common.noActiveCaseDesc') ||
                `You must have an active case to ${action}. Would you like to create one now?`,
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('cases.createCase') || 'Create Case',
                        onPress: () => {
                            if (onNavigateToNewCase) {
                                onNavigateToNewCase();
                            } else {
                                router.push('/case/new');
                            }
                        },
                    },
                ]
            );
            return false;
        }
        return true;
    };

    const hasAssignedAgent = (caseId: string): boolean => {
        const targetCase = cases.find((c) => c.id === caseId);
        return !!targetCase?.assignedAgent;
    };

    const canMessageCase = (
        caseId: string
    ): { allowed: boolean; message?: string } => {
        const targetCase = cases.find((c) => c.id === caseId);

        if (!targetCase) {
            return { allowed: false, message: 'Case not found' };
        }

        if (targetCase.status === 'CLOSED') {
            return {
                allowed: false,
                message:
                    'This case is closed. Please create a new case if you need further assistance.',
            };
        }

        if (!targetCase.assignedAgent) {
            return {
                allowed: false,
                message:
                    'An agent will be assigned to your case within 24 hours. You will be notified when you can start messaging.',
            };
        }

        return { allowed: true };
    };

    return {
        hasActiveCases: activeCases.length > 0,
        activeCases,
        requiresActiveCase,
        hasAssignedAgent,
        canMessageCase,
    };
};
