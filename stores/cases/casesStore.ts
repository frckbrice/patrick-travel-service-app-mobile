import { create } from 'zustand';
import { Case, CaseStatus } from '../../lib/types';
import { casesApi } from '../../lib/api/cases.api';
import { logger } from '../../lib/utils/logger';

interface CasesState {
  cases: Case[];
  currentCase: Case | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;

  // Actions
  fetchCases: (status?: CaseStatus, refresh?: boolean) => Promise<void>;
  fetchCaseById: (id: string) => Promise<void>;
  setCurrentCase: (caseItem: Case | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useCasesStore = create<CasesState>((set, get) => ({
  cases: [],
  currentCase: null,
  isLoading: false,
  error: null,
  page: 1,
  hasMore: true,

  fetchCases: async (status?: CaseStatus, refresh = false) => {
    try {
      const currentPage = refresh ? 1 : get().page;
      set({ isLoading: true, error: null });

      const response = await casesApi.getCases(status, currentPage, 20);

      if (!response.success) {
        set({ error: 'Failed to fetch cases', isLoading: false });
        return;
      }

      const newCases = response.data || [];
      const existingCases = refresh ? [] : get().cases;

      set({
        cases: [...existingCases, ...newCases],
        page: currentPage + 1,
        hasMore: response.page < response.totalPages,
        isLoading: false,
      });

      logger.info('Cases fetched successfully', { count: newCases.length });
    } catch (error: any) {
      logger.error('Fetch cases error', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchCaseById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await casesApi.getCaseById(id);

      if (!response.success || !response.data) {
        set({ error: 'Failed to fetch case', isLoading: false });
        return;
      }

      set({
        currentCase: response.data,
        isLoading: false,
      });

      logger.info('Case fetched successfully', { id });
    } catch (error: any) {
      logger.error('Fetch case by ID error', error);
      set({ error: error.message, isLoading: false });
    }
  },

  setCurrentCase: (caseItem: Case | null) => set({ currentCase: caseItem }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      cases: [],
      currentCase: null,
      page: 1,
      hasMore: true,
      error: null,
    }),
}));
