/** Normalizes an axios/API error into a user-facing message. */
export function message(error: unknown): { message: string; hint?: string } {
  const anyError = error as {
    response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
    message?: string;
  };
  const data = anyError?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors)[0]?.[0];
    if (first) return { message: first };
  }
  if (data?.message) return { message: data.message };
  if (anyError?.response?.status === 429) return { message: "Too many requests. Try again shortly." };
  if (anyError?.response?.status === 401 || anyError?.response?.status === 403)
    return { message: "You are not allowed to do that." };
  if (anyError?.message?.includes("Network"))
    return { message: "Cannot reach the TaskForge API.", hint: "Is the API container running?" };
  return { message: "Something went wrong. Please try again." };
}
