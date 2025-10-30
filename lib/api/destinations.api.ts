import { apiClient } from './axios';
import { logger } from '../utils/logger';

export interface Destination {
    id: string;
    name: string;
    code: string;
    flagEmoji: string;
    description?: string;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    _count?: {
        cases: number;
    };
}

export interface CreateDestinationRequest {
    name: string;
    code: string;
    flagEmoji: string;
    description?: string;
    isActive?: boolean;
    displayOrder?: number;
}

export interface UpdateDestinationRequest {
    name?: string;
    code?: string;
    flagEmoji?: string;
    description?: string;
    isActive?: boolean;
    displayOrder?: number;
}

class DestinationsApi {
    /**
     * Get all active destinations (public access)
     * Admins can include inactive destinations
     */
    async getDestinations(includeInactive: boolean = false): Promise<Destination[]> {
        try {
            logger.info('Fetching destinations', { includeInactive });

            const params = includeInactive ? { includeInactive: 'true' } : {};
            const response = await apiClient.get('/destinations', { params });

            if (response.data.success && response.data.data) {
                logger.info('Destinations fetched successfully', {
                    count: response.data.data.length,
                });
                return response.data.data;
            }

            throw new Error(response.data.error || 'Failed to fetch destinations');
        } catch (error: any) {
            logger.error('Error fetching destinations', error);
            throw error;
        }
    }

    /**
     * Get a single destination by ID
     */
    async getDestination(id: string): Promise<Destination> {
        try {
            logger.info('Fetching destination', { id });

            const response = await apiClient.get(`/destinations/${id}`);

            if (response.data.success && response.data.data) {
                return response.data.data;
            }

            throw new Error(response.data.error || 'Failed to fetch destination');
        } catch (error: any) {
            logger.error('Error fetching destination', error);
            throw error;
        }
    }

    /**
     * Create a new destination (ADMIN only)
     */
    async createDestination(data: CreateDestinationRequest): Promise<Destination> {
        try {
            logger.info('Creating destination', { name: data.name, code: data.code });

            const response = await apiClient.post('/destinations', data);

            if (response.data.success && response.data.data) {
                logger.info('Destination created successfully', {
                    id: response.data.data.id,
                });
                return response.data.data;
            }

            throw new Error(response.data.error || 'Failed to create destination');
        } catch (error: any) {
            logger.error('Error creating destination', error);
            throw error;
        }
    }

    /**
     * Update a destination (ADMIN only)
     */
    async updateDestination(
        id: string,
        data: UpdateDestinationRequest
    ): Promise<Destination> {
        try {
            logger.info('Updating destination', { id });

            const response = await apiClient.put(`/destinations/${id}`, data);

            if (response.data.success && response.data.data) {
                logger.info('Destination updated successfully', { id });
                return response.data.data;
            }

            throw new Error(response.data.error || 'Failed to update destination');
        } catch (error: any) {
            logger.error('Error updating destination', error);
            throw error;
        }
    }

    /**
     * Delete a destination (ADMIN only)
     * Soft deletes if there are associated cases
     */
    async deleteDestination(id: string): Promise<{ id: string; message: string }> {
        try {
            logger.info('Deleting destination', { id });

            const response = await apiClient.delete(`/destinations/${id}`);

            if (response.data.success) {
                logger.info('Destination deleted successfully', { id });
                return {
                    id,
                    message: response.data.message || 'Destination deleted successfully',
                };
            }

            throw new Error(response.data.error || 'Failed to delete destination');
        } catch (error: any) {
            logger.error('Error deleting destination', error);
            throw error;
        }
    }
}

export const destinationsApi = new DestinationsApi();

