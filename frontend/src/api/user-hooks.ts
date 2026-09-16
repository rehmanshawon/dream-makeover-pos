import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { usersApi } from './users';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/users';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

export function useUsers(): UseQueryResult<User[], Error> {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersApi.list(),
  });
}

export function useCreateUser(): UseMutationResult<User, Error, CreateUserRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => usersApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser(): UseMutationResult<
  User,
  Error,
  { id: string; payload: UpdateUserRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => usersApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
