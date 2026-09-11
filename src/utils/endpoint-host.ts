/**
 * Host of an endpoint URL, lowercased, or an empty string when the value is not
 * a parseable absolute URL.
 */
export function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Whether an endpoint points at `domain` or a subdomain of it.
 *
 * Provider detection decides where an API key is sent and which setup guide is
 * shown, so substring matching is not good enough:
 * `https://evil.example.com/v1?note=openrouter.ai` contains a provider's domain
 * without being that provider, and `https://openrouter.ai.evil.example.com/v1`
 * merely starts with it. Comparing the parsed host, with a leading dot required
 * for subdomains, rejects both.
 */
export function isProviderHost(endpoint: string, domain: string): boolean {
  const host = endpointHost(endpoint);
  if (!host) return false;
  const target = domain.toLowerCase();
  return host === target || host.endsWith(`.${target}`);
}
