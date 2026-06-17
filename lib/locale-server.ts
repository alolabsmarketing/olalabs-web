import { cookies } from "next/headers";
import { parseLang, type Lang } from "./i18n";

/**
 * Read the user's preferred locale from the NEXT_LOCALE cookie (set by LanguageSwitcher).
 * Falls back to "en" if not set or unrecognized.
 * Must be called from a Server Component or Route Handler.
 */
export async function getServerLocale(): Promise<Lang> {
  const cookieStore = await cookies();
  const value = cookieStore.get("NEXT_LOCALE")?.value;
  return parseLang(value);
}
