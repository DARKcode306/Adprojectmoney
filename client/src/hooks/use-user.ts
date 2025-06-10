import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useUser(initialUser: User | null) {
  return useQuery<{ user: User }>({
    queryKey: ["/api/user", initialUser?.telegramId],
    queryFn: async () => {
      if (!initialUser?.id) throw new Error("No user ID");
      const response = await fetch(`/api/user/${initialUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    initialData: initialUser ? { user: initialUser } : undefined,
    enabled: !!initialUser, // Only run query if initialUser exists
    refetchInterval: 3000, // Refetch every 3 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0, // Don't cache old data
  });
}