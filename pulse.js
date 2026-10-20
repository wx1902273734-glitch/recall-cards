// UI adapter: the classic renderer, card store and authenticated API stay shared.
(() => {
  const classicShowView = showView;
  const classicRefreshSidebar = refreshSidebar;
  const classicRenderLibrary = renderLibrary;
  const classicRefreshCloudCards = refreshCloudCards;
  const sidebarKey = 'recall-pulse-sidebar-collapsed';
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  function dueCards() {
    return cards.filter(card => card.due <= Date.now()).sort(comparePinned);
  }

  function updateImportDestination() {
    $('#importDestination').textContent = currentDeck === 'all' ? '保留文件中的牌组' : `导入到「${currentDeck}」`;
  }

  function renderOverview() {
    const due = dueCards();
    const groups = new Map();
    for (const card of cards) {
      if (!groups.has(card.deck)) groups.set(card.deck, {name: card.deck, count: 0, due: 0, pinned: false, pinnedAt: 0});
      const group = groups.get(card.deck);
      group.count++;
      if (card.due <= Date.now()) group.due++;
      group.pinned ||= Boolean(card.deckPinned);
      group.pinnedAt = Math.max(group.pinnedAt, card.deckPinnedAt || 0);
    }
    $('#pulseDue').textContent = due.length;
    $('#pulseTotal').textContent = cards.length;
    $('#pulseDeckCount').textContent = groups.size;
    $('#pulseDueMessage').textContent = due.length ? '不用一次记住所有。先从一张开始。' : cards.length ? '暂时没有到期卡片，也可以自由回忆。' : '从一个想记住的问题开始。';
    $('#startPulseReview').innerHTML = `${due.length ? '开始复习' : cards.length ? '浏览卡片' : '新建第一张'}${icon(due.length ? 'arrow' : cards.length ? 'stack' : 'plus')}`;
    $('#pulseDate').textContent = new Intl.DateTimeFormat('zh-CN', {year:'numeric', month:'long', day:'numeric', weekday:'short'}).format(new Date());
    const list = $('#pulseDecks');
    list.replaceChildren();
    const sortedGroups = [...groups.values()].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.pinned ? b.pinnedAt - a.pinnedAt : b.due - a.due));
    for (const group of sortedGroups.slice(0, 5)) {
      const button = document.createElement('button');
      button.className = 'overview-deck';
      button.innerHTML = `<span class="deck-symbol">${icon('stack')}</span><span class="overview-deck-name"><strong>${escapeHtml(group.name)}</strong><small>${group.count} 张卡片${group.pinned ? ' · 已置顶' : ''}</small></span><span class="deck-due${group.due ? ' has-due' : ''}">${group.due ? group.due + ' 张待复习' : '暂无到期'}${icon('chevron')}</span>`;
      button.onclick = () => {
        currentDeck = group.name;
        $('#searchInput').value = '';
        refreshSidebar();
        showView('library');
      };
      list.append(button);
    }
    if (!groups.size) {
      const empty = document.createElement('div');
      empty.className = 'next-empty';
      empty.innerHTML = '<strong>还没有牌组</strong><p>新建或导入卡片时，会自动建立对应的牌组。</p>';
      list.append(empty);
    }
    const next = due[0];
    $('#pulseNextPosition').textContent = next ? '待复习队列' : '你的节奏';
    const target = $('#pulseNextCard');
    target.replaceChildren();
    if (next) {
      const button = document.createElement('button');
      button.className = 'next-question';
      const title = next.question.split('\n').find(line => line.trim()) || '查看卡片';
      button.innerHTML = `<span class="next-deck">${icon('stack')}${escapeHtml(next.deck)}</span><h3>${escapeHtml(title)}</h3><span class="next-bottom"><span>${next.reviews ? `已复习 ${Number(next.reviews)} 次` : '还未复习'}</span><span>先想一想，再揭晓答案</span>${icon('arrow')}</span>`;
      button.onclick = () => {
        currentDeck = 'all';
        refreshSidebar();
        startReview();
      };
      target.append(button);
    } else {
      const empty = document.createElement('div');
      empty.className = 'next-empty';
      empty.innerHTML = `<strong>${cards.length ? '该记住的，慢慢来。' : '让第一张卡片开始。'}</strong><p>${cards.length ? '当前没有到期卡片。可以浏览已有内容，也可以添加新的问题。' : '把一个问题写在正面，把答案放在背面。'}</p><button class="button ghost">${cards.length ? '浏览全部卡片' : '新建卡片'}</button>`;
      empty.querySelector('button').onclick = () => cards.length ? openAllCards() : openEditor();
      target.append(empty);
    }
  }

  function openAllCards() {
    currentDeck = 'all';
    $('#searchInput').value = '';
    refreshSidebar();
    showView('library');
  }

  showView = function(name) {
    classicShowView(name);
    document.body.dataset.pulseView = name;
    if (name === 'overview') {
      $('#viewTitle').textContent = '学习概览';
      renderOverview();
    } else if (name === 'review') {
      $('#viewTitle').textContent = currentDeck === 'all' ? '专注回忆' : currentDeck;
    }
    $$('.nav-item').forEach(button => {
      if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $('#pulseDate').hidden = name !== 'overview';
    $('#importMenu').open = false;
    updateImportDestination();
  };

  refreshSidebar = function() {
    classicRefreshSidebar();
    renderOverview();
    updateImportDestination();
    $$('.deck-manage').forEach(button => {
      button.innerHTML = icon('more');
      button.setAttribute('aria-label', `管理牌组 ${button.dataset.manageDeck}`);
    });
  };

  renderLibrary = function() {
    classicRenderLibrary();
    const count = filteredCards().length;
    $('#pulseLibraryCount').textContent = `${currentDeck === 'all' ? '全部卡片' : currentDeck} · ${count} 张`;
    $$('[data-pin]').forEach(button => {
      const pinned = button.getAttribute('aria-pressed') === 'true';
      button.innerHTML = `${icon('pin')}<span>${pinned ? '已置顶' : '置顶'}</span>`;
    });
  };

  refreshCloudCards = function(nextCards) {
    const wasOverview = $('#overviewView').classList.contains('active');
    classicRefreshCloudCards(nextCards);
    if (wasOverview) showView('overview');
  };

  toggleSidebar = function(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    $('#mainSidebar').inert = collapsed;
    $('#sidebarToggle').setAttribute('aria-expanded', String(!collapsed));
    $('#sidebarToggle').setAttribute('aria-label', collapsed ? '展开侧边栏' : '收起侧边栏');
    $('#sidebarToggle').title = collapsed ? '展开侧边栏' : '收起侧边栏';
    localStorage.setItem(sidebarKey, String(collapsed));
    $('#deckMenu').hidden = true;
  };

  $$('.nav-item').forEach(button => button.onclick = () => {
    toggleSidebar(true);
    if (button.dataset.view === 'review') startReview();
    else if (button.dataset.view === 'library') showView('library');
    else showView('overview');
  });
  $('#searchInput').oninput = () => renderLibrary();
  $('#startPulseReview').onclick = () => {
    if (!dueCards().length) return cards.length ? openAllCards() : openEditor();
    currentDeck = 'all';
    refreshSidebar();
    startReview();
  };
  $('#seeAllCards').onclick = openAllCards;
  $('#closeSidebar').onclick = () => { toggleSidebar(true); $('#sidebarToggle').focus(); };
  $('#pulseSync').onclick = () => $('#cloudStatus').click();
  $('#importMenu').addEventListener('click', event => {
    if (event.target.closest('#importBtn,#importFolderBtn')) $('#importMenu').open = false;
  });
  $$('.segmented button').forEach(button => button.addEventListener('click', () => {
    $$('.segmented button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  document.addEventListener('click', event => {
    if (!event.target.closest('#importMenu')) $('#importMenu').open = false;
    if (!event.target.closest('#mainSidebar,#sidebarToggle,#deckMenu')) toggleSidebar(true);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!document.body.classList.contains('sidebar-collapsed')) { toggleSidebar(true); $('#sidebarToggle').focus(); }
      $('#importMenu').open = false;
    }
  });

  toggleSidebar(localStorage.getItem(sidebarKey) !== 'false');
  refreshSidebar();
  showView('overview');
  setInterval(() => {
    if (document.visibilityState === 'visible' && $('#overviewView').classList.contains('active')) renderOverview();
  }, 60000);
})();
