/**
 * Normalizes a configured backend URL to the canonical refresh endpoint.
 */
export function buildBackendRefreshUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (trimmed.length === 0) {
    throw new Error("backend refresh URL is empty");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("backend refresh URL is invalid");
  }

  if (!parsed.pathname || parsed.pathname === "/") {
    parsed.pathname = "/refresh";
  } else if (!parsed.pathname.endsWith("/refresh")) {
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/refresh`;
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

export interface BackendRefreshResponse {
  status: number;
  body: string;
}

/**
 * Transport hook used to issue the backend refresh request.
 */
export type BackendRefreshRequester = (refreshUrl: string) => Promise<BackendRefreshResponse>;

/**
 * Sends a backend refresh request and throws when the response is non-success.
 */
export async function postBackendRefresh(
  baseUrl: string,
  requestImpl: BackendRefreshRequester
): Promise<string> {
  const refreshUrl = buildBackendRefreshUrl(baseUrl);

  const response = await requestImpl(refreshUrl);
  if (response.status < 200 || response.status >= 300) {
    const detail = response.body.trim();
    const suffix = detail.length > 0 ? `: ${detail}` : "";
    throw new Error(`backend refresh failed (${response.status}${suffix})`);
  }

  return refreshUrl;
}
