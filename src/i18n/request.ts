import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Brazilian Portuguese is the product default; deployments can still
  // select another bundled catalogue through the environment variable.
  const locale = process.env.NEXT_PUBLIC_APP_LOCALE || 'pt-BR';

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    // Fallback to English if the dictionary for the requested locale doesn't exist yet
    messages = (await import(`../../messages/en.json`)).default;
  }

  return {
    locale,
    messages
  };
});
