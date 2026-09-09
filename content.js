// Markdown and HTML share the same renderer in review and editing.
function isHtmlBlock(token) {
  const language = String(token.lang || '').trim().split(/\s+/)[0].toLowerCase();
  const source = String(token.text || '').replace(/^\uFEFF/, '').trim();
  const looksLikeHtml = /^(?:<!doctype\s+html\b|<html(?:\s|>)|<(?:body|head|div|section|article|style|svg|table|main|header|button|form|canvas)(?:\s|>))/i.test(source);
  return ['html', 'htm', 'xhtml'].includes(language) || looksLikeHtml;
}

function previewDocument(source) {
  // Keep styles inside the frame; remove navigation, scripts and external embeds.
  const clean = DOMPurify.sanitize(source, {
    WHOLE_DOCUMENT: true, ADD_TAGS: ['style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'meta', 'link', 'form'],
    FORBID_ATTR: ['href', 'action', 'formaction', 'target']
  });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const policy = doc.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'";
  doc.head.prepend(policy);
  const style = doc.createElement('style');
  style.textContent = 'html,body{margin:0;min-height:0;font-family:system-ui,sans-serif}body{display:flow-root;overflow-wrap:anywhere}img,svg{max-width:100%}';
  doc.head.append(style);
  return '<!doctype html>' + doc.documentElement.outerHTML;
}

function renderRichContent(container, source = '') {
  const previews = [];
  const renderer = new marked.Renderer();
  renderer.code = function(token) {
    if (!isHtmlBlock(token)) return `<pre><code>${escapeHtml(token.text)}</code></pre>`;
    const index = previews.push(token.text) - 1;
    return `<section class="html-block" data-html-block="${index}"><div class="html-block-label">HTML 预览</div><details><summary>查看源码</summary><pre><code>${escapeHtml(token.text)}</code></pre></details></section>`;
  };
  // Raw HTML stays isolated as well; ordinary inline markup is sanitized below.
  renderer.html = function(token) {
    if (!token.block) return token.text;
    return this.code({text: token.text, lang: 'html'});
  };
  container.innerHTML = DOMPurify.sanitize(marked.parse(source, {renderer, gfm: true, breaks: false}));
  container.querySelectorAll('[data-html-block]').forEach(block => {
    const frame = document.createElement('iframe');
    frame.className = 'inline-html-preview';
    frame.title = 'HTML 内容预览';
    // Scripts remain disabled. Same-origin permits the parent to measure height.
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.onload = () => {
      try {
        const body = frame.contentDocument.body;
        const resize = () => {
          const height = Math.ceil(body.getBoundingClientRect().height);
          frame.style.height = Math.max(100, Math.min(5000, height + 4)) + 'px';
        };
        const observer = new ResizeObserver(resize);
        observer.observe(body);
        resize();
      } catch { /* file:// browsers may restrict measurement; keep scrollable fallback */ }
    };
    frame.srcdoc = previewDocument(previews[Number(block.dataset.htmlBlock)]);
    block.insertBefore(frame, block.querySelector('details'));
  });
}

function collectHtml(source = '') {
  const snippets = [];
  marked.walkTokens(marked.lexer(source), token => {
    if (token.type === 'code' && isHtmlBlock(token)) snippets.push(token.text);
    else if (token.type === 'html' && token.block) snippets.push(token.text);
  });
  return snippets.join('\n') || '<p style="padding:24px;color:#667085">内容中还没有 HTML 代码块。</p>';
}
