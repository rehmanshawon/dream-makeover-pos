import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loyaltySettingsApi } from './loyalty-settings';
import type { UpdateLoyaltySettingsRequest } from '../types/loyalty';

export const loyaltySettingsKey = ['loyalty-settings'] as const;

export function useLoyaltySettings() {
  return useQuery({
    queryKey: loyaltySettingsKey,
    queryFn: () => loyaltySettingsApi.get(),
  });
}

export function useUpdateLoyaltySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLoyaltySettingsRequest) => loyaltySettingsApi.update(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(loyaltySettingsKey, settings);
    },
  });
}
