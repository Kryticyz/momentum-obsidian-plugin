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

export async function postBackendRefresh(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const refreshUrl = buildBackendRefreshUrl(baseUrl);

  // OpenAPI contract: POST /refresh, no request body.
  const response = await fetchImpl(refreshUrl, {
    method: "POST",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const detail = await safeResponseText(response);
    const suffix = detail.length > 0 ? `: ${detail}` : "";
    throw new Error(`backend refresh failed (${response.status}${suffix})`);
  }

  return refreshUrl;
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch (_error) {
    return "";
  }
}
