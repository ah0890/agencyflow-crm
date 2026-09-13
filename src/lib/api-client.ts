/**
 * Thin fetch wrapper used by every form and list action in the browser.
 *
 * It normalises the two failure shapes the API can return - a plain message and
 * a per-field validation map - into one `ApiError`, so forms can show field
 * errors inline and fall back to a toast for everything else.
 */

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, signal } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", 0);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const data = payload as {
      message?: string;
      fieldErrors?: Record<string, string[]>;
    };
    throw new ApiError(
      data.message ?? "Something went wrong. Please try again.",
      response.status,
      data.fieldErrors,
    );
  }

  return payload as T;
}
