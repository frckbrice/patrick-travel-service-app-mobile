/**
 * usePagination Hook
 * Performance-optimized pagination for large lists
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

interface PaginationOptions<T> {
  fetchFunction: (
    page: number,
    limit: number
  ) => Promise<{
    items: T[];
    hasMore: boolean;
    total?: number;
  }>;
  limit?: number;
  enableCache?: boolean;
}

interface PaginationResult<T> {
  data: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  page: number;
  total?: number;
  loadMore: () => void;
  refresh: () => void;
  reset: () => void;
}

export function usePagination<T>({
  fetchFunction,
  limit = 20,
  enableCache = true,
}: PaginationOptions<T>): PaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | undefined>();

  const isLoadingRef = useRef(false);
  const cache = useRef<Map<number, T[]>>(new Map());

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean = true) => {
      // Prevent duplicate requests
      if (isLoadingRef.current) {
        logger.info('Pagination: Request already in progress');
        return;
      }

      // Check cache first
      if (enableCache && cache.current.has(pageNum)) {
        const cachedData = cache.current.get(pageNum)!;
        if (append) {
          setData((prev) => [...prev, ...cachedData]);
        } else {
          setData(cachedData);
        }
        setPage(pageNum);
        logger.info('Pagination: Loaded from cache', { page: pageNum });
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(!append);
      setIsRefreshing(append && pageNum === 1);

      try {
        const result = await fetchFunction(pageNum, limit);

        // Cache the result
        if (enableCache) {
          cache.current.set(pageNum, result.items);
        }

        if (append && pageNum > 1) {
          setData((prev) => [...prev, ...result.items]);
        } else {
          setData(result.items);
        }

        setPage(pageNum);
        setHasMore(result.hasMore);
        if (result.total !== undefined) {
          setTotal(result.total);
        }

        logger.info('Pagination: Fetched page', {
          page: pageNum,
          itemsCount: result.items.length,
          hasMore: result.hasMore,
        });
      } catch (error) {
        logger.error('Pagination: Error fetching page', error);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchFunction, limit, enableCache]
  );

  const loadMore = useCallback(() => {
    if (!isLoadingRef.current && hasMore) {
      fetchPage(page + 1, true);
    }
  }, [fetchPage, hasMore, page]);

  const refresh = useCallback(() => {
    cache.current.clear(); // Clear cache on refresh
    setData([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage]);

  const reset = useCallback(() => {
    cache.current.clear();
    setData([]);
    setPage(1);
    setHasMore(true);
    setTotal(undefined);
  }, []);

  return {
    data,
    isLoading,
    isRefreshing,
    hasMore,
    page,
    total,
    loadMore,
    refresh,
    reset,
  };
}
