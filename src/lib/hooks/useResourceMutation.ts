"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, apiRequest } from "@/lib/api-client";

/**
 * The one place that turns a form submit or a row action into a request.
 *
 * It handles the four things every mutation needs:
 *   - a pending flag for button spinners,
 *   - a success toast,
 *   - mapping server-side field errors back onto the form,
 *   - refreshing the server components so the table, KPIs and activity feed
 *     all reflect the change without a manual refetch.
 *
 * `router.refresh()` is the key piece: because the lists are server-rendered,
 * re-running the server render is the cache invalidation.
 */
export function useResourceMutation<TValues extends FieldValues = FieldValues>() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run<TResult>(options: {
    path: string;
    method?: "POST" | "PATCH" | "DELETE";
    body?: unknown;
    successMessage?: string;
    /** Passing the form's setError renders 422 responses inline. */
    setError?: UseFormSetError<TValues>;
    onSuccess?: (data: TResult) => void;
    /** Skip the server-component refresh (rare; used by optimistic screens). */
    skipRefresh?: boolean;
  }): Promise<TResult | null> {
    const {
      path,
      method = "POST",
      body,
      successMessage,
      setError,
      onSuccess,
      skipRefresh,
    } = options;

    setPending(true);
    try {
      const data = await apiRequest<TResult>(path, { method, body });

      if (successMessage) toast.success(successMessage);
      onSuccess?.(data);
      if (!skipRefresh) router.refresh();

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors && setError) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const message = messages?.[0];
            if (message) {
              setError(field as Path<TValues>, { type: "server", message });
            }
          }
          toast.error(error.message);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return null;
    } finally {
      setPending(false);
    }
  }

  return { run, pending };
}
