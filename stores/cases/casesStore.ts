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

  // PERFORMANCE: Optimistic update actions - O(1) operations
  addOptimisticCase: (caseItem: Case) => void;
  updateCaseById: (id: string, updates: Partial<Case>) => void;
  removeOptimisticCase: (id: string) => void;
}

export const useCasesStore = create<CasesState>((set, get) => ({
  cases: [],
  currentCase: null,
  isLoading: false,
  error: null,
  page: 1,
  hasMore: true,

  fetchCases: async (status?: CaseStatus, refresh = false) => {
    // Prevent concurrent requests
    if (get().isLoading) {
      logger.info(
        'Cases fetch already in progress - skipping duplicate request'
      );
      return;
    }

    try {
      const currentPage = refresh ? 1 : get().page;
      set({ isLoading: true, error: null });

      const response = await casesApi.getCases(status, currentPage, 20);

      if (!response.success) {
        set({ error: 'Failed to fetch cases', isLoading: false });
        return;
      }

      // Handle API response structure: { success, data: [...], pagination: {...} }
      // OR nested: { success, data: { cases: [...], pagination: {...} } }
      let newCases: Case[] = [];
      let pagination;

      if (Array.isArray(response.data)) {
        // Direct array format
        newCases = response.data;
        pagination = (response as any).pagination;
      } else if (response.data && (response.data as any).cases) {
        // Nested format { data: { cases: [...], pagination: {...} } }
        newCases = Array.isArray((response.data as any).cases)
          ? (response.data as any).cases
          : [];
        pagination = (response.data as any).pagination;
      }

      const currentCases = get().cases;
      const existingCases = refresh ? [] : currentCases;

      // Merge cases, keeping optimistic updates but replacing with server data when available
      let mergedCases: Case[] = [];

      if (refresh) {
        // On refresh, start with server cases but preserve optimistic cases not yet in server
        const serverCaseIds = new Set(newCases.map((c) => c.id));
        const optimisticCases = currentCases.filter(
          (c) => c.isPending && !serverCaseIds.has(c.id)
        );
        mergedCases = [...newCases, ...optimisticCases];
      } else {
        // On pagination, append new cases
        mergedCases = [...existingCases, ...newCases];
      }

      const hasMore =
        pagination?.hasMore ||
        pagination?.page < pagination?.totalPages ||
        false;

      set({
        cases: mergedCases,
        page: currentPage + 1,
        hasMore,
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

  // PERFORMANCE: O(1) - Add to start of array (unshift pattern)
  addOptimisticCase: (caseItem: Case) =>
    set((state) => ({
      cases: [caseItem, ...state.cases],
    })),

  // PERFORMANCE: O(n) findIndex + O(1) update - faster than map which creates n objects
  updateCaseById: (id: string, updates: Partial<Case>) =>
    set((state) => {
      const index = state.cases.findIndex((c) => c.id === id);
      if (index === -1) return state; // Early return - no change needed

      const updatedCases = [...state.cases];
      updatedCases[index] = { ...state.cases[index], ...updates };

      return { cases: updatedCases };
    }),

  // PERFORMANCE: O(n) filter - single pass, creates one array
  removeOptimisticCase: (id: string) =>
    set((state) => ({
      cases: state.cases.filter((c) => c.id !== id),
    })),
}));
