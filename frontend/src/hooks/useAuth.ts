import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { queryClient } from '@/lib/queryClient';
import type { LoginCredentials, RegisterCredentials } from '@/types';

export function useAuth() {
  const navigate = useNavigate();
  const { user, token, setAuth, clearAuth } = useStore();

  const isAuthenticated = !!token && !!user;

  // Silently refresh user profile if we have a token but no user in store
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !!token && !user,
    retry: false,
  });

  // Login mutation — backend returns {access_token, token_type, user}
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token);
      queryClient.setQueryData(['me'], data.user);
      toast.success(`Welcome back, ${data.user.full_name || 'Doctor'}! 👋`);
      navigate('/dashboard');
    },
    onError: () => {
      toast.error('Invalid email or password. Please try again.');
    },
  });

  // Register mutation — backend returns {access_token, token_type, user}
  const registerMutation = useMutation({
    mutationFn: (credentials: RegisterCredentials) => authApi.register(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token);
      queryClient.setQueryData(['me'], data.user);
      toast.success(`Account created! Welcome to CardioSense AI, ${data.user.full_name || 'Doctor'}! 🎉`);
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      toast.error(message ?? 'Registration failed. Email may already be in use.');
    },
  });

  // Logout
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Non-fatal — clear state regardless
    } finally {
      clearAuth();
      queryClient.clear();
      navigate('/login');
      toast.success('Logged out successfully');
    }
  }, [clearAuth, navigate]);

  return {
    user: user ?? currentUser ?? null,
    token,
    isAuthenticated,
    isLoadingUser,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout,
  };
}
