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

  function syncDeckControls() {
    const selected = $('#deckFilter').selectedOptions[0];
    const label = selected ? selected.textContent : '所有牌组';
    $('#deckFilterLabel').textContent = label;
    $('#deckFilterToggle').setAttribute('aria-label', `筛选牌组：${label}`);
    $$('.deck-filter-option').forEach(button => {
      const active = button.dataset.value === $('#deckFilter').value;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $$('#mainSidebar [data-deck]').forEach(button => {
      if (button.dataset.deck === currentDeck) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }

  function closeDeckPicker(restoreFocus = false) {
    $('#deckFilterMenu').hidden = true;
    $('#deckFilterToggle').setAttribute('aria-expanded', 'false');
    if (restoreFocus) $('#deckFilterToggle').focus();
  }

  function positionDeckPicker() {
    const menu = $('#deckFilterMenu');
    const anchor = $('#deckFilterToggle').getBoundingClientRect();
    const width = Math.min(Math.max(anchor.width, 220), window.innerWidth - 24);
    const below = window.innerHeight - anchor.bottom - 20;
    const above = anchor.top - 20;
    const openAbove = below < 140 && above > below;
    const maxHeight = Math.max(80, Math.min(280, openAbove ? above : below));
    menu.style.width = `${width}px`;
    menu.style.maxHeight = `${maxHeight}px`;
    menu.style.left = `${Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12))}px`;
    menu.style.top = `${openAbove ? Math.max(12, anchor.top - Math.min(menu.scrollHeight, maxHeight) - 8) : anchor.bottom + 8}px`;
  }

  function openDeckPicker(focusOption = false, last = false) {
    toggleSidebar(true);
    $('#importMenu').open = false;
    $('#deckFilterMenu').hidden = false;
    $('#deckFilterToggle').setAttribute('aria-expanded', 'true');
    positionDeckPicker();
    if (focusOption) {
      const options = $$('.deck-filter-option');
      (last ? options.at(-1) : options.find(button => button.getAttribute('aria-selected') === 'true') || options[0])?.focus();
    }
  }

  function renderDeckPicker() {
    const menu = $('#deckFilterMenu');
    menu.replaceChildren();
    [...$('#deckFilter').options].forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'deck-filter-option';
      button.dataset.value = option.value;
      button.setAttribute('role', 'option');
      button.innerHTML = `<span>${escapeHtml(option.textContent)}</span>${icon('check')}`;
      button.onclick = () => {
        $('#deckFilter').value = option.value;
        $('#deckFilter').dispatchEvent(new Event('change', {bubbles: true}));
        closeDeckPicker(true);
      };
      menu.append(button);
    });
    syncDeckControls();
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
    closeDeckPicker();
    syncDeckControls();
    updateImportDestination();
  };

  refreshSidebar = function() {
    classicRefreshSidebar();
    renderOverview();
    updateImportDestination();
    renderDeckPicker();
    $$('#deckList .deck-dot').forEach(dot => { dot.outerHTML = icon('stack'); });
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
  $('#deckFilterToggle').onclick = () => $('#deckFilterMenu').hidden ? openDeckPicker() : closeDeckPicker();
  $('#deckFilterToggle').addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openDeckPicker(true, event.key === 'ArrowUp');
    }
  });
  $('#deckFilterMenu').addEventListener('keydown', event => {
    const options = $$('.deck-filter-option');
    const index = options.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (next !== undefined) { event.preventDefault(); options[next]?.focus(); }
    if (event.key === 'Tab') closeDeckPicker(true);
  });
  window.addEventListener('resize', () => { if (!$('#deckFilterMenu').hidden) positionDeckPicker(); });
  window.addEventListener('scroll', event => {
    if (!$('#deckFilterMenu').hidden && !$('#deckFilterMenu').contains(event.target)) closeDeckPicker();
  }, true);
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
    if (!event.target.closest('#deckPicker,#deckFilterMenu')) closeDeckPicker();
    if (!event.target.closest('#importMenu')) $('#importMenu').open = false;
    if (!event.target.closest('#mainSidebar,#sidebarToggle,#deckMenu')) toggleSidebar(true);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!$('#deckFilterMenu').hidden) closeDeckPicker(true);
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
