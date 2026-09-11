import { describe, it, expect } from 'vitest';
import { endpointHost, isProviderHost } from '../endpoint-host';

describe('endpointHost', () => {
  it('extracts and lowercases the host', () => {
    expect(endpointHost('https://API.OpenRouter.AI/api/v1/chat/completions'))
      .toBe('api.openrouter.ai');
  });

  it('ignores path, query and port', () => {
    expect(endpointHost('http://localhost:1234/v1/chat/completions?x=1')).toBe('localhost');
  });

  it('returns empty for anything unparseable', () => {
    for (const bad of ['', 'not a url', '/v1/chat/completions', 'openrouter.ai']) {
      expect(endpointHost(bad)).toBe('');
    }
  });
});

describe('isProviderHost', () => {
  it('matches the domain itself and its subdomains', () => {
    expect(isProviderHost('https://openrouter.ai/api/v1', 'openrouter.ai')).toBe(true);
    expect(isProviderHost('https://api.openrouter.ai/v1', 'openrouter.ai')).toBe(true);
    expect(isProviderHost('https://api.groq.com/openai/v1', 'groq.com')).toBe(true);
    expect(isProviderHost('https://api.openai.com/v1', 'openai.com')).toBe(true);
  });

  it('rejects a domain that merely appears in the URL', () => {
    // The substring check this replaces treated these as the real provider, and
    // the OpenRouter branch sends the user's API key on the strength of it.
    expect(isProviderHost('https://evil.example.com/v1?note=openrouter.ai', 'openrouter.ai')).toBe(false);
    expect(isProviderHost('https://evil.example.com/openrouter.ai/v1', 'openrouter.ai')).toBe(false);
  });

  it('rejects a domain used as a prefix of another host', () => {
    expect(isProviderHost('https://openrouter.ai.evil.example.com/v1', 'openrouter.ai')).toBe(false);
    expect(isProviderHost('https://notopenai.com/v1', 'openai.com')).toBe(false);
  });

  it('requires a dot before the domain for subdomains', () => {
    expect(isProviderHost('https://fakegroq.com/v1', 'groq.com')).toBe(false);
  });

  it('is case-insensitive on both sides', () => {
    expect(isProviderHost('https://API.GROQ.COM/v1', 'GROQ.com')).toBe(true);
  });

  it('rejects unparseable endpoints instead of throwing', () => {
    expect(isProviderHost('', 'openai.com')).toBe(false);
    expect(isProviderHost('openai.com', 'openai.com')).toBe(false);
  });

  it('does not treat a local endpoint as a provider', () => {
    expect(isProviderHost('http://localhost:1234/v1/chat/completions', 'openrouter.ai')).toBe(false);
  });
});
