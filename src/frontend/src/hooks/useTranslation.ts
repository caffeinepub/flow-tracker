import { type TranslationKey, translations } from "../i18n/translations";
import { useLocalStorage } from "./useLocalStorage";

export function useTranslation() {
  const [lang] = useLocalStorage<string>("sft_lang", "en");
  const dict = translations[lang] ?? translations.en;
  return (key: TranslationKey): string => dict[key] ?? key;
}
