(function() {
  const lang = chrome.i18n.getUILanguage()?.split('-')[0] || 'en';
  document.documentElement.classList.add(`lang-${lang}`);
  document.documentElement.setAttribute('lang', lang);
})();