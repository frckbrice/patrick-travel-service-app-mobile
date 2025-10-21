/**
 * Custom hook to monitor case updates and notify users
 * Provides fallback mechanism if push notifications fail
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useCasesStore } from '../../stores/cases/casesStore';
import { notificationService } from '../services/notifications';
import { logger } from '../utils/logger';
import { Case, CaseStatus } from '../types';

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const ASSIGNMENT_CHECK_INTERVAL = 2 * 60 * 1000; // Check every 2 minutes for new assignments

interface CaseUpdate {
    caseId: string;
    type: 'assignment' | 'status_change';
    oldValue?: string;
    newValue: string;
}

/**
 * Hook to monitor case updates and send local notifications
 * Acts as fallback if backend push notifications fail
 */
export function useCaseUpdates() {
    const cases = useCasesStore((state) => state.cases);
    const fetchCases = useCasesStore((state) => state.fetchCases);
    const previousCasesRef = useRef<Case[]>([]);
    const intervalRef = useRef<number | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);

    const checkForUpdates = async () => {
        try {
            // PERFORMANCE: Skip polling if app is in foreground (user can see updates)
            if (appState.current === 'active') {
                logger.debug('Skipping update check - app is active');
                return;
            }

            // Fetch latest cases from backend
            await fetchCases(undefined, false);

            // Compare with previous state
            const currentCases = useCasesStore.getState().cases;
            const updates: CaseUpdate[] = [];

            currentCases.forEach((currentCase) => {
                const previousCase = previousCasesRef.current.find(
                    (c) => c.id === currentCase.id
                );

                if (previousCase) {
                    // Check for agent assignment
                    if (
                        !previousCase.assignedAgent &&
                        currentCase.assignedAgent
                    ) {
                        updates.push({
                            caseId: currentCase.id,
                            type: 'assignment',
                            newValue: `${currentCase.assignedAgent.firstName} ${currentCase.assignedAgent.lastName}`,
                        });
                    }

                    // Check for status change
                    if (previousCase.status !== currentCase.status) {
                        updates.push({
                            caseId: currentCase.id,
                            type: 'status_change',
                            oldValue: previousCase.status,
                            newValue: currentCase.status,
                        });
                    }
                }
            });

            // PERFORMANCE: Debounce - only send notifications if we have updates
            if (updates.length === 0) {
                previousCasesRef.current = currentCases;
                return;
            }

            // Send local notifications for updates
            for (const update of updates) {
                const caseData = currentCases.find((c) => c.id === update.caseId);
                if (!caseData) continue;

                if (update.type === 'assignment') {
                    await notificationService.scheduleLocalNotification(
                        '👤 Case Assigned!',
                        `Your case ${caseData.referenceNumber} has been assigned to ${update.newValue}`,
                        {
                            type: 'CASE_ASSIGNED',
                            caseId: update.caseId,
                            caseRef: caseData.referenceNumber,
                        }
                    );

                    logger.info('Local notification sent for case assignment', {
                        caseId: update.caseId,
                        agent: update.newValue,
                    });
                } else if (update.type === 'status_change') {
                    await notificationService.scheduleLocalNotification(
                        '📋 Case Status Updated',
                        `Your case ${caseData.referenceNumber} is now ${update.newValue.replace(/_/g, ' ').toLowerCase()}`,
                        {
                            type: 'CASE_STATUS_UPDATE',
                            caseId: update.caseId,
                            status: update.newValue,
                        }
                    );

                    logger.info('Local notification sent for status change', {
                        caseId: update.caseId,
                        oldStatus: update.oldValue,
                        newStatus: update.newValue,
                    });
                }
            }

            // Update reference
            previousCasesRef.current = currentCases;
        } catch (error) {
            logger.error('Failed to check for case updates', error);
        }
    };

    useEffect(() => {
        // Initialize with current cases
        previousCasesRef.current = cases;

        // Only run polling in background as fallback
        // Don't poll if app is in foreground (real-time updates handle that)
        const subscription = AppState.addEventListener(
            'change',
            (nextAppState: AppStateStatus) => {
                if (
                    appState.current.match(/inactive|background/) &&
                    nextAppState === 'active'
                ) {
                    // App came to foreground - check for updates
                    logger.info('App resumed, checking for case updates');
                    checkForUpdates();
                }

                appState.current = nextAppState;
            }
        );

        // Periodic check every 5 minutes (as fallback)
        intervalRef.current = setInterval(
            checkForUpdates,
            CHECK_INTERVAL
        ) as unknown as number;

        return () => {
            subscription.remove();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        checkForUpdates,
    };
}

