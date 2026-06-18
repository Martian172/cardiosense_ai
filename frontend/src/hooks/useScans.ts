import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { scansApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { CreateScanPayload } from '@/types';

export function useScansList(page = 1, size = 20) {
  return useQuery({
    queryKey: ['scans', page, size],
    queryFn: () => scansApi.list(page, size),
  });
}

export function useScan(id: string | undefined) {
  return useQuery({
    queryKey: ['scans', id],
    queryFn: () => scansApi.get(id!),
    enabled: !!id,
  });
}

export function useScanStats() {
  return useQuery({
    queryKey: ['scan-stats'],
    queryFn: scansApi.stats,
    refetchInterval: 30_000, // refresh every 30s
  });
}

export function useCreateScan() {
  return useMutation({
    mutationFn: (payload: CreateScanPayload) => scansApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scans'] });
      void queryClient.invalidateQueries({ queryKey: ['scan-stats'] });
      toast.success('ECG analysis complete!');
    },
    onError: () => {
      toast.error('Analysis failed. Please try again.');
    },
  });
}

export function useDemoScan() {
  return useMutation({
    mutationFn: scansApi.demo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scans'] });
      void queryClient.invalidateQueries({ queryKey: ['scan-stats'] });
    },
    onError: () => {
      toast.error('Demo scan failed. Using local simulation.');
    },
  });
}

export function useDeleteScan() {
  return useMutation({
    mutationFn: (id: string) => scansApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scans'] });
      void queryClient.invalidateQueries({ queryKey: ['scan-stats'] });
      toast.success('Scan deleted successfully.');
    },
    onError: () => {
      toast.error('Failed to delete scan.');
    },
  });
}

export function useUpdateScanNotes() {
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      scansApi.updateNotes(id, notes),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['scans', id] });
      toast.success('Notes saved.');
    },
    onError: () => {
      toast.error('Failed to save notes.');
    },
  });
}
