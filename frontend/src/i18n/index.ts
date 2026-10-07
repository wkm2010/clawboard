import { en } from './en';
import { zhHant } from './zh-Hant';

export type Locale = 'en' | 'zh-Hant';
export const DEFAULT_LOCALE: Locale = 'zh-Hant';
export const messages = { en, 'zh-Hant': zhHant } as const;
export function getMessages(locale: string = DEFAULT_LOCALE) {
  return messages[locale as Locale] ?? messages.en;
}
