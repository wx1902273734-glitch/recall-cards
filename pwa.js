let installPrompt = null;
const installButton = document.querySelector('#installBtn');

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
  showToast('回响卡已安装');
});

installButton.onclick = async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
    return;
  }
  showToast(/iphone|ipad|ipod/i.test(navigator.userAgent) ? '请点 Safari 分享按钮，再选“添加到主屏幕”' : '请使用浏览器菜单中的“安装应用”');
};
