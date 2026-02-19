export function buildBackendRefreshUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (trimmed.length === 0) {
    throw new Error("backend refresh URL is empty");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (_error) {
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

export type BackendRefreshRequester = (refreshUrl: string) => Promise<BackendRefreshResponse>;

export async function postBackendRefresh(
  baseUrl: string,
  requestImpl: BackendRefreshRequester = defaultRefreshRequest
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

async function defaultRefreshRequest(refreshUrl: string): Promise<BackendRefreshResponse> {
  // OpenAPI contract: POST /refresh, no request body.
  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      Accept: "application/json"
    }
  });

  let body = "";
  try {
    body = await response.text();
  } catch (_error) {
    body = "";
  }

  return {
    status: response.status,
    body
  };
}
