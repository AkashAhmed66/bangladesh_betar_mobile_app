import Config from 'react-native-config';

function required(name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(
      `Missing ${name}. Copy .env.example to the environment file for this build and set it.`,
    );
  }
  return normalized;
}

function normalizeApiBase(value: string) {
  const normalized = value.replace(/\/+$/, '');

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.host) {
      throw new Error('unsupported URL');
    }
  } catch {
    throw new Error(
      `Invalid BETAR_API_BASE "${value}". Use an absolute http:// or https:// API URL.`,
    );
  }

  return normalized;
}

export const env = Object.freeze({
  apiBase: normalizeApiBase(required('BETAR_API_BASE', Config.BETAR_API_BASE)),
  environment: Config.BETAR_ENV?.trim() || 'development',
});
