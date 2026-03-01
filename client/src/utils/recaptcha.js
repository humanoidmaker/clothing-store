const SCRIPT_ID = 'google-recaptcha-script-v3';

const loadRecaptchaScript = (siteKey) =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('reCAPTCHA is only available in browser'));
      return;
    }
    if (!siteKey) {
      reject(new Error('reCAPTCHA site key is missing'));
      return;
    }

    if (window.grecaptcha?.execute) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(script);
  });

export const getRecaptchaToken = async (siteKey, action = 'submit') => {
  const key = String(siteKey || '').trim();
  if (!key) {
    return '';
  }

  await loadRecaptchaScript(key);

  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(key, { action });
        resolve(String(token || '').trim());
      } catch {
        reject(new Error('Unable to generate reCAPTCHA token'));
      }
    });
  });
};
