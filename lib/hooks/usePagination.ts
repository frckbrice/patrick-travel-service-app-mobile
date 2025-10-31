import { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

export interface PaginationState {
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  totalCount: number;
}

export interface PaginationOptions {
  initialLimit?: number;
  loadMoreLimit?: number;
  onError?: (error: Error) => void;
}

export interface PaginationActions<T> {
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export interface UsePaginationResult<T> extends PaginationState, PaginationActions<T> {
  data: T[];
  setData: (data: T[]) => void;
  prependData: (newData: T[]) => void;
  appendData: (newData: T[]) => void;
}

/**
 * Reusable pagination hook for chat messages, emails, and other paginated data
 * Implements modern patterns similar to WhatsApp, Telegram, etc.
 */
export function usePagination<T>(
  loadInitialFn: () => Promise<{ data: T[]; hasMore: boolean; totalCount: number }>,
  loadMoreFn: (beforeTimestamp: number) => Promise<{ data: T[]; hasMore: boolean }>,
  getTimestamp: (item: T) => number,
  options: PaginationOptions = {}
): UsePaginationResult<T> {
  const {
    initialLimit = 20,
    loadMoreLimit = 20,
    onError,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const prependData = useCallback((newData: T[]) => {
    setData(prev => {
      const existing = prev || [];
      // Filter out duplicates based on id or tempId
      const uniqueNewData = newData.filter((newItem) => {
        const existingHasSameId = existing.some((existingItem) => {
          const a = existingItem as Partial<{ id: string; tempId: string }>;
          const b = newItem as Partial<{ id: string; tempId: string }>;
          return (a.id && b.id && a.id === b.id) || (a.tempId && b.tempId && a.tempId === b.tempId);
        });
        return !existingHasSameId;
      });
      return [...uniqueNewData, ...existing];
    });
  }, []);

  const appendData = useCallback((newData: T[]) => {
    setData(prev => {
      const existing = prev || [];
      // Filter out duplicates based on id or tempId
      const uniqueNewData = newData.filter((newItem) => {
        const existingHasSameId = existing.some((existingItem) => {
          const a = existingItem as Partial<{ id: string; tempId: string }>;
          const b = newItem as Partial<{ id: string; tempId: string }>;
          return (a.id && b.id && a.id === b.id) || (a.tempId && b.tempId && a.tempId === b.tempId);
        });
        return !existingHasSameId;
      });
      return [...existing, ...uniqueNewData];
    });
  }, []);

  const loadInitial = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      logger.info('Starting loadInitial', {});
      const result = await loadInitialFn();
      logger.info('loadInitialFn completed', { result });
      
      // Ensure result.data is an array
      const dataArray = Array.isArray(result.data) ? result.data : [];
      
      setData(dataArray);
      setHasMore(result.hasMore || false);
      setTotalCount(result.totalCount || 0);
      hasMoreRef.current = result.hasMore || false;

      logger.info('Initial data loaded', { 
        count: dataArray.length, 
        hasMore: result.hasMore, 
        totalCount: result.totalCount 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      logger.error('Failed to load initial data', err);
      onError?.(err as Error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [loadInitialFn, onError]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || isLoadingRef.current || !data || data.length === 0) return;

    try {
      setIsLoadingMore(true);
      
      // Get the oldest timestamp from current data
      const oldestTimestamp = Math.min(...data.map(getTimestamp));
      
      const result = await loadMoreFn(oldestTimestamp);
      
      // Ensure result.data is an array
      const dataArray = Array.isArray(result.data) ? result.data : [];
      
      if (dataArray.length > 0) {
        prependData(dataArray);
        setHasMore(result.hasMore || false);
        hasMoreRef.current = result.hasMore || false;
        
        logger.info('More data loaded', { 
          count: dataArray.length, 
          hasMore: result.hasMore 
        });
      } else {
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more data';
      setError(errorMessage);
      logger.error('Failed to load more data', err);
      onError?.(err as Error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [data, loadMoreFn, getTimestamp, prependData, onError]);

  const refresh = useCallback(async () => {
    // Reset state and load initial data
    setData([]);
    setHasMore(true);
    setError(null);
    hasMoreRef.current = true;
    await loadInitial();
  }, [loadInitial]);

  return {
    data,
    setData,
    prependData,
    appendData,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    totalCount,
    loadInitial,
    loadMore,
    refresh,
    clearError,
  };
}

/**
 * Hook specifically for chat messages with optimized caching
 */
export function useChatPagination<T extends { timestamp: number; id?: string; tempId?: string }>(
  caseId: string,
  loadInitialMessages: (caseId: string) => Promise<{
    messages: T[];
    hasMore: boolean;
    totalCount: number;
  }>,
  loadOlderMessages: (caseId: string, beforeTimestamp: number) => Promise<{
    messages: T[];
    hasMore: boolean;
  }>
) {
  return usePagination<T>(
    async () => {
      const result = await loadInitialMessages(caseId);
      logger.info('\n\n loadInitialMessages result', {
        result,
        messages: result.messages,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
      });
      return {
        data: Array.isArray(result.messages) ? result.messages : [],
        hasMore: !!result.hasMore,
        totalCount: result.totalCount || 0,
      };
    },
    async (beforeTimestamp) => {
      const result = await loadOlderMessages(caseId, beforeTimestamp);
      return {
        data: Array.isArray(result.messages) ? result.messages : [],
        hasMore: !!result.hasMore,
      };
    },
    (message: T) => message.timestamp,
    {
      initialLimit: 50,
      loadMoreLimit: 20,
    }
  );
}

/**
 * Hook for email pagination (future use)
 */
export function useEmailPagination<E extends { timestamp: number }>(
  folderId: string,
  loadInitialEmails: (folderId: string) => Promise<{
    emails: E[];
    hasMore: boolean;
    totalCount: number;
  }>,
  loadOlderEmails: (folderId: string, beforeTimestamp: number) => Promise<{
    emails: E[];
    hasMore: boolean;
  }>
) {
  return usePagination<E>(
    async () => {
      const result = await loadInitialEmails(folderId);
      return {
        data: Array.isArray(result.emails) ? result.emails : [],
        hasMore: !!result.hasMore,
        totalCount: result.totalCount || 0,
      };
    },
    async (beforeTimestamp) => {
      const result = await loadOlderEmails(folderId, beforeTimestamp);
      return {
        data: Array.isArray(result.emails) ? result.emails : [],
        hasMore: !!result.hasMore,
      };
    },
    (email: E) => email.timestamp,
    {
      initialLimit: 20,
      loadMoreLimit: 20,
    }
  );
}