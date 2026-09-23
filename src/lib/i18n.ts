import {useCallback} from 'react';
import {useUi} from '../stores/ui';

type Messages = Record<string, unknown>;
// Keep the same dictionaries used by the web portal. `require` lets Metro load
// the JSON without changing the RN TypeScript preset's module settings.
const dictionaries: Record<'en' | 'bn', Messages> = {
  en: require('../locales/en.json') as Messages,
  bn: require('../locales/bn.json') as Messages,
};

function lookup(messages: Messages, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    return current && typeof current === 'object' ? (current as Messages)[segment] : undefined;
  }, messages);
  return typeof value === 'string' ? value : undefined;
}
export function translate(locale: 'en' | 'bn', key: string, values: Record<string, string | number> = {}) {
  let value = lookup(dictionaries[locale], key) ?? lookup(dictionaries.en, key) ?? key;
  return value.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? `{${name}}`));
}
export function useTranslation() {
  const locale = useUi(s => s.locale);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(locale, key, values), [locale]);
  return {locale, t};
}
export function localizedText(item: Record<string, unknown>, field: string, locale: 'en' | 'bn') {
  const primary = locale === 'bn' ? item[`${field}_bn`] : item[field];
  const fallback = locale === 'bn' ? item[field] : item[`${field}_bn`];
  return typeof primary === 'string' && primary ? primary : typeof fallback === 'string' ? fallback : '';
}
