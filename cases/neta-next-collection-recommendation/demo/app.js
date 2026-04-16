const currentUrl = "../outputs/current-profile.json";
const normalizedUrl = "../outputs/normalized-feed.json";
const recommendationUrl = "../outputs/recommendation.json";

const weightConfig = {
  concept: 9,
  intent: 6,
  theme: 4,
  tag: 3,
  format: 2,
  interaction: 2,
  community: 1,
  preference: 2,
  recommendationBoost: 4,
};

const state = {
  allItems: [],
  currentId: "",
  likedIds: new Set(),
  dismissedIds: new Set(),
  history: [],
  recommendationSeedId: "",
  mobileDeckIndex: 0,
  activeTab: "current",
};

const dom = {
  heroSummary: document.getElementById("hero-summary"),
  heroFlow: document.getElementById("hero-flow"),
  heroStats: document.getElementById("hero-stats"),
  currentCard: document.getElementById("current-card"),
  nextCard: document.getElementById("next-card"),
  likedList: document.getElementById("liked-list"),
  signalCloud: document.getElementById("signal-cloud"),
  recommendationList: document.getElementById("recommendation-list"),
  focusTabs: [...document.querySelectorAll(".focus-tab")],
  focusViews: [...document.querySelectorAll(".focus-view")],
  deckControls: document.getElementById("mobile-deck-controls"),
  deckPrev: document.getElementById("deck-prev"),
  deckNext: document.getElementById("deck-next"),
  deckStatus: document.getElementById("deck-status"),
  resetButton: document.getElementById("reset-button"),
  sheetBackdrop: document.getElementById("sheet-backdrop"),
  bottomSheet: document.getElementById("bottom-sheet"),
  sheetClose: document.getElementById("sheet-close"),
  sheetTitle: document.getElementById("sheet-title"),
  sheetSummary: document.getElementById("sheet-summary"),
  sheetChips: document.getElementById("sheet-chips"),
  sheetList: document.getElementById("sheet-list"),
  template: document.getElementById("card-template"),
};

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function intersection(a = [], b = []) {
  const bSet = new Set(b);
  return a.filter((item) => bSet.has(item));
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getItem(id) {
  return state.allItems.find((item) => item.uuid === id);
}

function buildPreferenceState() {
  const likedItems = [...state.likedIds].map(getItem).filter(Boolean);
  const buckets = {
    concept: new Map(),
    intent: new Map(),
    theme: new Map(),
    tag: new Map(),
    community: new Map(),
  };

  for (const item of likedItems) {
    for (const concept of item.concept_labels || []) {
      buckets.concept.set(concept, (buckets.concept.get(concept) || 0) + 1);
    }
    for (const intent of item.intent_labels || []) {
      buckets.intent.set(intent, (buckets.intent.get(intent) || 0) + 1);
    }
    for (const theme of item.theme_labels || []) {
      buckets.theme.set(theme, (buckets.theme.get(theme) || 0) + 1);
    }
    for (const tag of item.content_tags || []) {
      buckets.tag.set(tag, (buckets.tag.get(tag) || 0) + 1);
    }
    for (const tag of item.community_tags || []) {
      buckets.community.set(tag, (buckets.community.get(tag) || 0) + 1);
    }
  }

  return buckets;
}

function computeCandidateScore(current, candidate, preferences) {
  const conceptOverlap = intersection(current.concept_labels, candidate.concept_labels);
  const intentOverlap = intersection(current.intent_labels, candidate.intent_labels);
  const themeOverlap = intersection(current.theme_labels, candidate.theme_labels);
  const tagOverlap = intersection(current.content_tags, candidate.content_tags);
  const formatOverlap = intersection(current.format_labels, candidate.format_labels);
  const interactionOverlap = intersection(current.interaction_flags, candidate.interaction_flags);
  const communityOverlap = intersection(current.community_tags, candidate.community_tags);

  let score = 0;
  score += conceptOverlap.length * weightConfig.concept;
  score += intentOverlap.length * weightConfig.intent;
  score += themeOverlap.length * weightConfig.theme;
  score += Math.min(tagOverlap.length, 4) * weightConfig.tag;
  score += formatOverlap.length * weightConfig.format;
  score += interactionOverlap.length * weightConfig.interaction;
  score += communityOverlap.length * weightConfig.community;

  for (const concept of candidate.concept_labels || []) {
    score += (preferences.concept.get(concept) || 0) * weightConfig.preference;
  }
  for (const intent of candidate.intent_labels || []) {
    score += (preferences.intent.get(intent) || 0) * (weightConfig.preference + 1);
  }
  for (const theme of candidate.theme_labels || []) {
    score += (preferences.theme.get(theme) || 0) * weightConfig.preference;
  }
  for (const tag of candidate.content_tags || []) {
    score += (preferences.tag.get(tag) || 0);
  }
  for (const tag of candidate.community_tags || []) {
    score += (preferences.community.get(tag) || 0);
  }

  if (candidate.uuid === state.recommendationSeedId) {
    score += weightConfig.recommendationBoost;
  }

  const reasons = [];
  if (conceptOverlap.length) reasons.push(`概念连续：${conceptOverlap.slice(0, 3).join(" / ")}`);
  if (intentOverlap.length) reasons.push(`玩法意图：${intentOverlap.slice(0, 3).join(" / ")}`);
  if (themeOverlap.length) reasons.push(`主题：${themeOverlap.slice(0, 3).join(" / ")}`);
  if (tagOverlap.length) reasons.push(`标签：${tagOverlap.slice(0, 3).join(" / ")}`);
  if (!reasons.length && interactionOverlap.length) reasons.push(`交互连续：${interactionOverlap.join(" / ")}`);
  if (!reasons.length && communityOverlap.length) reasons.push(`社区连续：${communityOverlap.join(" / ")}`);
  if (!reasons.length) reasons.push("作为候选保留，等待更多用户信号。");

  return {
    candidate,
    score,
    reason: reasons[0],
    evidence: {
      conceptOverlap,
      intentOverlap,
      themeOverlap,
      tagOverlap,
      formatOverlap,
      interactionOverlap,
      communityOverlap,
    },
  };
}

function buildQueue() {
  const current = getItem(state.currentId);
  if (!current) return [];

  const preferences = buildPreferenceState();
  const queue = state.allItems
    .filter((item) => item.uuid !== current.uuid)
    .filter((item) => !state.dismissedIds.has(item.uuid))
    .filter((item) => !state.history.includes(item.uuid))
    .map((item) => computeCandidateScore(current, item, preferences))
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, "zh-CN"))
    .slice(0, 8);

  return queue;
}

function renderHero(queue) {
  const current = getItem(state.currentId);
  const likedCount = state.likedIds.size;
  const skippedCount = state.dismissedIds.size;
  const nextCount = queue.length;
  dom.heroSummary.textContent = current
    ? `当前基于《${current.title}》继续推荐。点赞会强化用户信号，跳过会从候选池移除，下一条推荐即时重算。`
    : "当前没有可用种子。";

  dom.heroStats.innerHTML = [
    { label: "Current", value: current ? current.title : "None" },
    { label: "Liked", value: likedCount },
    { label: "Skipped", value: skippedCount },
    { label: "Queue", value: nextCount },
  ]
    .map(
      (stat) => `
        <div class="hero-stat">
          <div class="eyebrow">${escapeHtml(stat.label)}</div>
          <strong>${escapeHtml(stat.value)}</strong>
        </div>
      `,
    )
    .join("");

  const flowParts = [];
  if (current) {
    flowParts.push(`<span class="flow-pill">当前：${escapeHtml(current.title)}</span>`);
  }
  if (queue[0]) {
    flowParts.push(`<span class="flow-arrow">→</span>`);
    flowParts.push(`<span class="flow-pill">下一条：${escapeHtml(queue[0].candidate.title)}</span>`);
  }
  if (state.likedIds.size) {
    flowParts.push(`<span class="flow-arrow">→</span>`);
    flowParts.push(`<span class="flow-pill">已沉淀 ${state.likedIds.size} 个偏好信号</span>`);
  }
  dom.heroFlow.innerHTML = flowParts.join("");
}

function setActiveTab(tabId) {
  state.activeTab = tabId;
  for (const tab of dom.focusTabs) {
    tab.classList.toggle("is-active", tab.dataset.tab === tabId);
  }
  for (const view of dom.focusViews) {
    view.classList.toggle("is-active", view.dataset.view === tabId);
  }
}

function createChips(values, accent = false) {
  return unique(values)
    .slice(0, 6)
    .map((value) => `<span class="chip ${accent ? "chip-accent" : ""}">${escapeHtml(value)}</span>`)
    .join("");
}

function openSheet({ title, summary, chips = [], items = [] }) {
  dom.sheetTitle.textContent = title || "Reason";
  dom.sheetSummary.textContent = summary || "";
  dom.sheetChips.innerHTML = createChips(chips, true) || `<span class="chip">no signal</span>`;
  dom.sheetList.innerHTML = items
    .filter(Boolean)
    .map((item) => `<div class="sheet-item">${escapeHtml(item)}</div>`)
    .join("");
  dom.sheetBackdrop.hidden = false;
  dom.bottomSheet.classList.add("is-open");
  dom.bottomSheet.setAttribute("aria-hidden", "false");
}

function closeSheet() {
  dom.sheetBackdrop.hidden = true;
  dom.bottomSheet.classList.remove("is-open");
  dom.bottomSheet.setAttribute("aria-hidden", "true");
}

function createCardNode(entry, index, mode = "queue") {
  const fragment = dom.template.content.firstElementChild.cloneNode(true);
  const { candidate } = entry;
  fragment.classList.add("is-deck-card");
  const media = fragment.querySelector(".card-media");
  media.innerHTML = candidate.cover_url
    ? `<img src="${escapeHtml(candidate.cover_url)}" alt="${escapeHtml(candidate.title)}" />`
    : "";
  fragment.querySelector(".rank-pill").textContent = mode === "next" ? "Next" : `#${index + 1}`;
  fragment.querySelector(".score-pill").textContent = `${entry.score} pts`;
  fragment.querySelector(".route-pill").textContent =
    (candidate.source_feed_item?.recall_sources || []).slice(0, 2).join(" / ") || "recall";
  fragment.querySelector(".card-title").textContent = candidate.title;
  fragment.querySelector(".card-chips").innerHTML =
    createChips(entry.evidence.conceptOverlap, true) +
    createChips(entry.evidence.intentOverlap) +
    createChips(entry.evidence.themeOverlap);
  fragment.querySelector(".meta-row").innerHTML = [
    candidate.content_tags?.length
      ? `<span class="meta-chip">标签 ${escapeHtml(candidate.content_tags.slice(0, 2).join(" / "))}</span>`
      : "",
    candidate.interaction_flags?.length
      ? `<span class="meta-chip">互动 ${escapeHtml(candidate.interaction_flags.join(" / "))}</span>`
      : "",
    candidate.community_tags?.length
      ? `<span class="meta-chip">社区 ${escapeHtml(candidate.community_tags.slice(0, 2).join(" / "))}</span>`
      : "",
    candidate.source_feed_item?.recall_sources?.length
      ? `<span class="meta-chip">召回 ${escapeHtml(candidate.source_feed_item.recall_sources.join(" / "))}</span>`
      : "",
  ].join("");
  fragment.querySelector(".open-link").href = candidate.collection_link;
  fragment.querySelector(".detail-button").addEventListener("click", () =>
    openSheet({
      title: candidate.title,
      summary: entry.reason,
      chips: [...(entry.evidence.conceptOverlap || []), ...(entry.evidence.intentOverlap || []), ...(entry.evidence.themeOverlap || [])],
      items: [
        `概念连续：${(entry.evidence.conceptOverlap || []).join(" / ") || "none"}`,
        `玩法意图：${(entry.evidence.intentOverlap || []).join(" / ") || "none"}`,
        `主题重合：${(entry.evidence.themeOverlap || []).join(" / ") || "none"}`,
        `标签重合：${(entry.evidence.tagOverlap || []).join(" / ") || "none"}`,
        `互动形态：${(entry.evidence.interactionOverlap || []).join(" / ") || "none"}`,
        `社区连续：${(entry.evidence.communityOverlap || []).join(" / ") || "none"}`,
      ],
    }),
  );
  fragment.querySelector(".like-button").addEventListener("click", () => handleLike(candidate.uuid));
  fragment.querySelector(".skip-button").addEventListener("click", () => handleSkip(candidate.uuid));
  return fragment;
}

function renderCurrentCard(queue) {
  const current = getItem(state.currentId);
  if (!current) {
    dom.currentCard.innerHTML = `<div class="empty-state">没有当前种子。</div>`;
    return;
  }

  const topCandidate = queue[0];
  const fragment = dom.template.content.firstElementChild.cloneNode(true);
  fragment.classList.add("is-current");
  const media = fragment.querySelector(".card-media");
  media.innerHTML = current.cover_url
    ? `<img src="${escapeHtml(current.cover_url)}" alt="${escapeHtml(current.title)}" />`
    : "";
  fragment.querySelector(".rank-pill").textContent = "Current";
  fragment.querySelector(".score-pill").textContent = topCandidate ? `Next ${topCandidate.score}` : "No Queue";
  fragment.querySelector(".route-pill").textContent =
    (current.source_feed_item?.recall_sources || []).slice(0, 2).join(" / ") || "seed";
  fragment.querySelector(".card-title").textContent = current.title;
  fragment.querySelector(".card-chips").innerHTML =
    createChips(current.concept_labels, true) +
    createChips(current.intent_labels) +
    createChips(current.theme_labels);
  fragment.querySelector(".meta-row").innerHTML = `
    <span class="meta-chip">互动: ${escapeHtml((current.interaction_flags || []).join(" / ") || "none")}</span>
    <span class="meta-chip">内容标签: ${escapeHtml((current.content_tags || []).slice(0, 3).join(" / ") || "none")}</span>
    <span class="meta-chip">社区标签: ${escapeHtml((current.community_tags || []).slice(0, 3).join(" / ") || "none")}</span>
  `;
  const openLink = fragment.querySelector(".open-link");
  openLink.href = current.collection_link;
  fragment.querySelector(".detail-button").addEventListener("click", () =>
    openSheet({
      title: current.title,
      summary: topCandidate?.reason || "当前没有更适合的候选，等待更多用户信号或者重置队列。",
      chips: [...(current.concept_labels || []), ...(current.intent_labels || []), ...(current.theme_labels || [])],
      items: [
        `互动形态：${(current.interaction_flags || []).join(" / ") || "none"}`,
        `内容标签：${(current.content_tags || []).slice(0, 4).join(" / ") || "none"}`,
        `社区标签：${(current.community_tags || []).slice(0, 4).join(" / ") || "none"}`,
      ],
    }),
  );
  const likeButton = fragment.querySelector(".like-button");
  likeButton.textContent = "点赞当前并继续";
  likeButton.addEventListener("click", () => handleLike(current.uuid));
  fragment.querySelector(".skip-button").textContent = "跳过当前";
  fragment.querySelector(".skip-button").addEventListener("click", () => handleSkip(current.uuid));
  dom.currentCard.replaceChildren(fragment);
}

function renderNextCard(queue) {
  const nextEntry = queue[0];
  if (!nextEntry) {
    dom.nextCard.innerHTML = `<div class="empty-state">当前没有可推荐的下一条作品。</div>`;
    return;
  }
  dom.nextCard.replaceChildren(createCardNode(nextEntry, 0, "next"));
}

function renderSignalState() {
  const likedItems = [...state.likedIds].map(getItem).filter(Boolean);
  if (!likedItems.length) {
    dom.likedList.innerHTML = `<div class="empty-state">还没有点赞行为。</div>`;
  } else {
    dom.likedList.innerHTML = likedItems
      .map((item) => `<span class="mini-pill">${escapeHtml(item.title)}</span>`)
      .join("");
  }

  const preferences = buildPreferenceState();
  const chips = [];
  for (const [bucket, map] of Object.entries(preferences)) {
    const top = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    for (const [key, value] of top) {
      chips.push(`<span class="mini-pill"><span>${escapeHtml(bucket)}</span><strong>${escapeHtml(`${key} ×${value}`)}</strong></span>`);
    }
  }
  dom.signalCloud.innerHTML = chips.length ? chips.join("") : `<div class="empty-state">点赞后会在这里聚合偏好信号。</div>`;
}

function renderQueue(queue) {
  if (!queue.length) {
    dom.deckStatus.textContent = "0 / 0";
    dom.recommendationList.innerHTML = `<div class="empty-state">候选已经用尽，点击重置重新开始。</div>`;
    return;
  }

  if (state.mobileDeckIndex >= queue.length) {
    state.mobileDeckIndex = 0;
  }

  const nodes = queue.map((entry, index) => {
    const fragment = createCardNode(entry, index, "queue");
    const mobileOffset = index - state.mobileDeckIndex;
    if (mobileOffset === 0) {
      fragment.dataset.deckLayer = "0";
    } else if (mobileOffset === 1) {
      fragment.dataset.deckLayer = "1";
      fragment.classList.add("is-deck-back");
    } else if (mobileOffset === 2) {
      fragment.dataset.deckLayer = "2";
      fragment.classList.add("is-deck-back");
    } else {
      fragment.dataset.deckLayer = "hidden";
      fragment.classList.add("is-deck-back");
    }

    return fragment;
  });

  dom.deckStatus.textContent = `${Math.min(state.mobileDeckIndex + 1, queue.length)} / ${queue.length}`;
  dom.deckPrev.disabled = state.mobileDeckIndex <= 0;
  dom.deckNext.disabled = state.mobileDeckIndex >= queue.length - 1;
  dom.recommendationList.replaceChildren(...nodes);
}

function handleLike(id) {
  state.likedIds.add(id);
  state.history.push(id);
  state.currentId = id;
  state.mobileDeckIndex = 0;
  render();
}

function handleSkip(id) {
  state.dismissedIds.add(id);
  if (state.mobileDeckIndex > 0) {
    state.mobileDeckIndex -= 1;
  }
  if (state.currentId === id) {
    const queue = buildQueue();
    state.currentId = queue[0]?.candidate.uuid || state.currentId;
  }
  render();
}

function resetState() {
  state.likedIds.clear();
  state.dismissedIds.clear();
  state.history = [];
  state.currentId = state.seedCurrentId;
  state.mobileDeckIndex = 0;
  closeSheet();
  render();
}

function shiftDeck(step) {
  const queue = buildQueue();
  if (!queue.length) return;
  state.mobileDeckIndex = Math.max(0, Math.min(queue.length - 1, state.mobileDeckIndex + step));
  render();
}

function render() {
  const queue = buildQueue();
  setActiveTab(state.activeTab);
  renderHero(queue);
  renderCurrentCard(queue);
  renderNextCard(queue);
  renderSignalState();
  renderQueue(queue);
}

async function loadData() {
  const [current, normalized, recommendation] = await Promise.all([
    fetch(currentUrl).then((res) => res.json()),
    fetch(normalizedUrl).then((res) => res.json()),
    fetch(recommendationUrl).then((res) => res.json()),
  ]);

  state.allItems = unique([
    current.uuid,
    ...(normalized.candidate_collections || []).map((item) => item.uuid),
  ]).map((id) => {
    if (id === current.uuid) return current;
    return normalized.candidate_collections.find((item) => item.uuid === id);
  });
  state.currentId = current.uuid;
  state.seedCurrentId = current.uuid;
  state.recommendationSeedId = recommendation.recommended_collection_uuid;
  render();
}

dom.resetButton.addEventListener("click", resetState);
dom.deckPrev.addEventListener("click", () => shiftDeck(-1));
dom.deckNext.addEventListener("click", () => shiftDeck(1));
for (const tab of dom.focusTabs) {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
}
dom.sheetClose.addEventListener("click", closeSheet);
dom.sheetBackdrop.addEventListener("click", closeSheet);

loadData().catch((error) => {
  console.error(error);
  dom.heroSummary.textContent = "数据加载失败，请通过本地 HTTP 服务打开此页面。";
  dom.currentCard.innerHTML = `<div class="empty-state">加载失败：${escapeHtml(error.message)}</div>`;
});
