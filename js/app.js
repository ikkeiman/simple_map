const { createApp, reactive, ref, computed } = Vue;

const START_MIN = 9 * 60 + 41; // デモ上の出発時刻 9:41
const TRAVEL_MIN = 15; // スポット間の移動時間（デモ用固定値）

createApp({
  setup() {
    // ---------- 画面遷移 ----------
    const screen = ref('home');
    const history = ref([]);
    function goto(next) {
      history.value.push(screen.value);
      screen.value = next;
    }
    function back() {
      screen.value = history.value.pop() || 'home';
    }

    // ---------- トースト ----------
    const toastMsg = ref('');
    let toastTimer = null;
    function showToast(msg) {
      toastMsg.value = msg;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (toastMsg.value = ''), 2200);
    }

    // ---------- データ ----------
    const spots = reactive(SPOTS);
    const priorityMeta = PRIORITY_META;
    const categoryMeta = CATEGORY_META;
    function spotById(id) { return spots.find(s => s.id === id); }

    // ---------- ホーム ----------
    const activeCategory = ref(null);
    const dateLabel = ref('2026年10月20日');
    const visibleSpots = computed(() => {
      if (!activeCategory.value) return spots;
      return spots.filter(s => s.category === activeCategory.value);
    });
    function toggleCategory(cat) {
      activeCategory.value = activeCategory.value === cat ? null : cat;
    }

    // ---------- 検索 ----------
    const searchQuery = ref('');
    const searchSuggestions = computed(() => {
      const q = searchQuery.value.trim();
      if (!q) return [];
      return spots.filter(s => s.name.includes(q) || categoryMeta[s.category].label.includes(q));
    });
    const searchTab = ref('all');
    const searchResults = computed(() => {
      const q = searchQuery.value.trim();
      let list = q
        ? spots.filter(s => s.name.includes(q) || categoryMeta[s.category].label.includes(q))
        : spots;
      if (searchTab.value === 'pinned') list = list.filter(s => s.priority);
      if (searchTab.value === 'unpinned') list = list.filter(s => !s.priority);
      return list;
    });
    function openSearch() { searchQuery.value = ''; goto('search'); }
    function submitSearch() {
      if (!searchQuery.value.trim()) return;
      searchTab.value = 'all';
      goto('searchResults');
    }
    function pickSuggestion(spot) {
      searchQuery.value = spot.name;
      searchTab.value = 'all';
      goto('searchResults');
    }

    // ---------- スポット詳細・ピン登録 ----------
    const selectedSpotId = ref(null);
    const selectedSpot = computed(() => spotById(selectedSpotId.value));
    function openDetail(spot) {
      selectedSpotId.value = spot.id;
      goto('detail');
    }
    function setPriority(spot, priority) {
      spot.priority = priority;
      showToast(`「${spot.name}」を${priorityMeta[priority].label}でピンを立てました`);
      if (screen.value === 'detail') {
        screen.value = 'home';
        history.value = [];
      }
    }

    // ---------- ルートリスト ----------
    const routeListItems = computed(() =>
      spots.filter(s => s.priority && s.priority !== 'visited')
    );

    // ---------- 出発前設定 ----------
    const transportMode = ref('walk');
    const endHour = ref(18);
    const orderedRouteIds = computed(() => {
      // 優先度順（絶対→出来れば→時間があったら）に並べ、既定ルート順を尊重
      const order = { absolute: 0, maybe: 1, sometime: 2 };
      return [...routeListItems.value]
        .sort((a, b) => (order[a.priority] - order[b.priority]))
        .map(s => s.id);
    });
    const stayOverrides = reactive({}); // id -> 分
    function stayFor(id) {
      if (stayOverrides[id] != null) return stayOverrides[id];
      const s = spotById(id);
      return s ? s.myStay : 30;
    }
    function adjustStay(id, delta) {
      const cur = stayFor(id);
      stayOverrides[id] = Math.max(10, cur + delta);
    }
    const availableMinutes = computed(() => endHour.value * 60 - START_MIN);
    const includedIds = computed(() => {
      let acc = 0;
      const result = [];
      orderedRouteIds.value.forEach((id, i) => {
        const travel = i === 0 ? 0 : TRAVEL_MIN;
        const need = travel + stayFor(id);
        if (acc + need <= availableMinutes.value || spotById(id).priority === 'absolute') {
          acc += need;
          result.push(id);
        }
      });
      return result;
    });
    const excludedIds = computed(() =>
      orderedRouteIds.value.filter(id => !includedIds.value.includes(id))
    );

    function openRouteSetup() { goto('routeSetup'); }

    // ---------- ルート編集用の状態（並び替え・削除） ----------
    const editOrder = ref([]); // 表示中の並び（id配列）
    const removedIds = ref([]); // 手動で外したid
    function syncEditOrderFromIncluded() {
      editOrder.value = [...includedIds.value];
      removedIds.value = [...excludedIds.value];
    }
    function moveItem(id, dir) {
      const idx = editOrder.value.indexOf(id);
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= editOrder.value.length) return;
      const arr = [...editOrder.value];
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      editOrder.value = arr;
    }
    function removeFromEdit(id) {
      editOrder.value = editOrder.value.filter(x => x !== id);
      removedIds.value.push(id);
    }
    function restoreToEdit(id) {
      removedIds.value = removedIds.value.filter(x => x !== id);
      editOrder.value.push(id);
    }

    // ---------- タイムライン計算（ルート結果・編集共通） ----------
    function buildTimeline(ids) {
      let clock = START_MIN;
      return ids.map((id, i) => {
        if (i > 0) clock += TRAVEL_MIN;
        const arrive = clock;
        clock += stayFor(id);
        return { id, spot: spotById(id), arriveMin: arrive, order: i + 1 };
      });
    }
    function formatTime(min) {
      const h = Math.floor(min / 60) % 24;
      const m = Math.floor(min % 60);
      return `${h}:${m.toString().padStart(2, '0')}`;
    }

    const finalRouteIds = ref([]); // ルート作成確定後の順序（結果画面・案内で使用）
    const finalExcludedIds = ref([]);
    function confirmRouteCreate() {
      finalRouteIds.value = [...includedIds.value];
      finalExcludedIds.value = [...excludedIds.value];
      syncEditOrderFromIncluded();
      goto('routeResult');
    }
    const timeline = computed(() => buildTimeline(finalRouteIds.value));

    function openEdit() {
      editOrder.value = [...finalRouteIds.value];
      removedIds.value = [...finalExcludedIds.value];
      goto('edit');
    }
    const editTimeline = computed(() => buildTimeline(editOrder.value));
    const editImpactMin = computed(() => {
      const before = timeline.value.length ? timeline.value[timeline.value.length - 1] : null;
      const after = editTimeline.value.length ? editTimeline.value[editTimeline.value.length - 1] : null;
      if (!before || !after) return 0;
      const beforeEnd = before.arriveMin + stayFor(before.id);
      const afterEnd = after.arriveMin + stayFor(after.id);
      return afterEnd - beforeEnd;
    });
    function applyEdit() {
      finalRouteIds.value = [...editOrder.value];
      finalExcludedIds.value = [...removedIds.value];
      showToast('変更を反映しました');
      goto('routeResult');
    }

    function dismissExcluded(id, mode) {
      finalExcludedIds.value = finalExcludedIds.value.filter(x => x !== id);
      showToast(mode === 'today' ? `「${spotById(id).name}」は今日は諦めます` : `「${spotById(id).name}」を明日以降に持ち越しました`);
    }

    // ---------- 案内中 ----------
    const guidanceIndex = ref(0);
    const currentGuideId = computed(() => finalRouteIds.value[guidanceIndex.value]);
    const currentGuideSpot = computed(() => currentGuideId.value ? spotById(currentGuideId.value) : null);
    const nextGuideSpot = computed(() => {
      const nid = finalRouteIds.value[guidanceIndex.value + 1];
      return nid ? spotById(nid) : null;
    });
    function startGuidance() {
      guidanceIndex.value = 0;
      goto('guidance');
    }
    function markVisited() {
      const spot = currentGuideSpot.value;
      if (!spot) return;
      spot.priority = 'visited';
      showToast(`「${spot.name}」を実際に行ったにしました`);
      if (guidanceIndex.value + 1 >= finalRouteIds.value.length) {
        goto('afterTrip');
      } else {
        guidanceIndex.value++;
      }
    }

    // ---------- 動的リルート（デモ用トリガー） ----------
    const showReroute = ref(false);
    function triggerReroute() { showReroute.value = true; }
    function chooseRerouteOption(label) {
      showReroute.value = false;
      if (label === 'keep') {
        showToast('このままのルートを続けます');
        return;
      }
      showToast('ルートを更新しました：' + label);
    }

    // ---------- リルートの設定 (1h) ----------
    const travelStyles = TRAVEL_STYLES;
    const rs = reactive({
      style: 'mattari',
      priorityOrder: DEFAULT_PRIORITY_ORDER.map(p => ({ ...p })),
      fullCustom: true,
      points: {
        budget: true,
        weather: true,
        photogenic: false,
        hours: true,
        offpeak: false,
      },
      budgetYen: 5000,
      lunch: '12:00–13:00',
      dinner: '18:00–19:00',
      breakInterval: '2時間ごと',
      transport2: 'walk',
      walkDistanceKm: 6,
      maxSegmentMin: 20,
      fixFirst: '現在地・みなと駅前',
      fixLast: null,
      mustVisit: ['茶屋ひなた'],
      autoSuggest: true,
      aggressiveness: 'standard', // 控えめ / standard / 積極的
      triggerThresholdMin: 15,
      autoArrival: true,
      arrivalSensitivity: 'standard', // ゆるめ / standard / きっちり
    });
    const lunchOptions = ['11:30', '12:00–13:00', '13:30', '確保しない'];
    const dinnerOptions = ['17:30', '18:00–19:00', '19:30', '確保しない'];
    const breakOptions = ['1時間ごと', '2時間ごと', '3時間ごと', 'なし'];
    const transportOptions2 = [
      { key: 'walk', label: '🚶 徒歩' },
      { key: 'train', label: '🚃 電車' },
      { key: 'bus', label: '🚌 バス' },
      { key: 'car', label: '🚗 車' },
    ];

    function togglePoint(key) { rs.points[key] = !rs.points[key]; }
    function movePriority(idx, dir) {
      const to = idx + dir;
      if (to < 0 || to >= rs.priorityOrder.length) return;
      const arr = [...rs.priorityOrder];
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      rs.priorityOrder = arr;
    }
    function resetRerouteSettings() {
      rs.style = 'mattari';
      rs.priorityOrder = DEFAULT_PRIORITY_ORDER.map(p => ({ ...p }));
      rs.fullCustom = false;
      showToast('設定をリセットしました');
    }
    const rerouteSettingsFrom = ref('guidance');
    function openRerouteSettings() {
      rerouteSettingsFrom.value = showReroute.value ? 'reroute' : 'guidance';
      showReroute.value = false;
      goto('rerouteSettings');
    }
    function confirmRerouteSettings() {
      showToast('新しい基準でルートを並び替えました');
      screen.value = 'guidance';
      if (rerouteSettingsFrom.value === 'reroute') showReroute.value = true;
    }
    function backFromRerouteSettings() {
      screen.value = 'guidance';
      if (rerouteSettingsFrom.value === 'reroute') showReroute.value = true;
    }

    // ---------- 旅のあと ----------
    const tripRating = ref(4);
    const tripTags = reactive({ 'おすすめ': true, '思い出深い': false, 'アニメ聖地': false });
    function toggleTripTag(tag) { tripTags[tag] = !tripTags[tag]; }
    function submitTrip() {
      showToast('記録を保存しました');
      screen.value = 'home';
      history.value = [];
      guidanceIndex.value = 0;
    }

    return {
      screen, goto, back,
      toastMsg,
      spots, priorityMeta, categoryMeta,
      activeCategory, dateLabel, visibleSpots, toggleCategory,
      searchQuery, searchSuggestions, searchTab, searchResults, openSearch, submitSearch, pickSuggestion,
      selectedSpot, openDetail, setPriority,
      routeListItems,
      transportMode, endHour, availableMinutes, includedIds, excludedIds,
      openRouteSetup, confirmRouteCreate, stayFor, adjustStay,
      timeline, formatTime, finalExcludedIds, dismissExcluded,
      openEdit, editOrder, editTimeline, editImpactMin, moveItem, removeFromEdit, restoreToEdit, removedIds, applyEdit,
      guidanceIndex, currentGuideSpot, nextGuideSpot, startGuidance, markVisited,
      showReroute, triggerReroute, chooseRerouteOption,
      tripRating, tripTags, toggleTripTag, submitTrip,
      TRAVEL_MIN,
      travelStyles, rs, lunchOptions, dinnerOptions, breakOptions, transportOptions2,
      togglePoint, movePriority, resetRerouteSettings, openRerouteSettings, confirmRerouteSettings,
      rerouteSettingsFrom, backFromRerouteSettings,
      history, finalRouteIds,
      showToast,
    };
  },
  template: `
  <div class="phone-shell">

    <!-- ============ HOME ============ -->
    <section v-if="screen==='home'" class="screen">
      <div class="topbar">
        <button class="search-bar" @click="openSearch">
          <span class="icon">🔍</span> 場所・お店を検索する
        </button>
        <div class="chip-row">
          <button v-for="(m,cat) in categoryMeta" :key="cat"
                  class="chip" :class="{active: activeCategory===cat}"
                  @click="toggleCategory(cat)">{{m.icon}} {{m.label}}</button>
        </div>
      </div>

      <div class="map-area">
        <div class="map-block" style="top:10%; left:8%; width:26%; height:18%"></div>
        <div class="map-block" style="top:32%; left:6%; width:20%; height:22%"></div>
        <div class="map-block" style="top:8%; left:60%; width:30%; height:16%"></div>
        <div class="map-block round" style="top:44%; left:56%; width:34%; height:26%"></div>
        <div class="map-block" style="top:74%; left:10%; width:22%; height:16%"></div>
        <div class="me-dot"></div>

        <button v-for="s in visibleSpots" :key="s.id"
                class="pin" :class="s.priority || 'none'"
                :style="{top: s.top+'%', left: s.left+'%'}"
                @click="openDetail(s)">
          <span class="pin-dot"></span>
        </button>

        <div class="legend">
          <div v-for="(m,key) in priorityMeta" :key="key" class="legend-row">
            <span class="dot" :style="{background:m.color}"></span>{{m.short}}
          </div>
        </div>
      </div>

      <div class="date-nav">
        <button class="nav-arrow">‹</button>
        <span>📅 {{dateLabel}}</span>
        <button class="nav-arrow">›</button>
      </div>

      <div class="bottom-actions">
        <button class="btn ghost" @click="goto('routeList')">ルートリスト</button>
        <button class="btn primary" @click="openRouteSetup">✈ 最適ルート作成</button>
      </div>

      <div class="tabbar">
        <div class="tab active"><span>🗺</span>マップ</div>
        <div class="tab" @click="showToast('この画面はデモ未実装です')"><span>📅</span>予定</div>
        <div class="tab" @click="showToast('この画面はデモ未実装です')"><span>🕘</span>振り返り</div>
        <div class="tab" @click="showToast('この画面はデモ未実装です')"><span>⚙</span>設定</div>
      </div>
    </section>

    <!-- ============ 検索サジェスト ============ -->
    <section v-if="screen==='search'" class="screen">
      <div class="header-row">
        <button class="icon-btn" @click="back">‹</button>
        <input class="search-input" v-model="searchQuery" placeholder="場所・お店を検索する"
               @keyup.enter="submitSearch" autofocus>
        <button class="icon-btn" @click="searchQuery=''">✕</button>
      </div>
      <div class="suggest-list">
        <div class="suggest-quick" v-if="searchQuery" @click="submitSearch">
          🔍 「{{searchQuery}}」で検索
        </div>
        <button v-for="s in searchSuggestions" :key="s.id" class="suggest-item" @click="pickSuggestion(s)">
          <span class="thumb">{{s.photo}}</span>
          <div>
            <div class="suggest-name">{{s.name}}</div>
            <div class="suggest-sub">{{categoryMeta[s.category].label}} ・ 徒歩{{ (s.top+s.left)%9 + 3 }}分</div>
          </div>
        </button>
        <p v-if="!searchQuery" class="empty-hint">お店や場所の名前を入力してください</p>
      </div>
    </section>

    <!-- ============ 検索結果（3タブ） ============ -->
    <section v-if="screen==='searchResults'" class="screen">
      <div class="header-row">
        <button class="icon-btn" @click="back">‹</button>
        <div class="result-title">「{{searchQuery || 'すべて'}}」の結果 {{searchResults.length}}件</div>
      </div>
      <div class="tabs">
        <button class="tab-btn" :class="{active: searchTab==='all'}" @click="searchTab='all'">全て</button>
        <button class="tab-btn" :class="{active: searchTab==='pinned'}" @click="searchTab='pinned'">過去にピン</button>
        <button class="tab-btn" :class="{active: searchTab==='unpinned'}" @click="searchTab='unpinned'">未ピン</button>
      </div>
      <div class="result-list">
        <div v-for="s in searchResults" :key="s.id" class="result-card">
          <div class="result-card-top" @click="openDetail(s)">
            <span class="thumb">{{s.photo}}</span>
            <div>
              <div class="suggest-name">{{s.name}}</div>
              <div class="suggest-sub" v-if="s.priority">{{priorityMeta[s.priority].short}}でピン済み</div>
              <div class="suggest-sub" v-else>未ピン・タップで詳細</div>
            </div>
          </div>
          <div class="priority-row">
            <button class="pbtn absolute" @click="setPriority(s,'absolute')">絶対</button>
            <button class="pbtn maybe" @click="setPriority(s,'maybe')">出来れば</button>
            <button class="pbtn sometime" @click="setPriority(s,'sometime')">時間あれば</button>
          </div>
        </div>
        <p v-if="!searchResults.length" class="empty-hint">該当する場所が見つかりませんでした</p>
      </div>
    </section>

    <!-- ============ スポット詳細 ============ -->
    <section v-if="screen==='detail' && selectedSpot" class="screen detail">
      <div class="detail-hero">
        <button class="icon-btn on-hero" @click="back">‹</button>
        <button class="icon-btn on-hero right">♡</button>
        <span class="hero-photo">{{selectedSpot.photo}}</span>
      </div>
      <div class="detail-body">
        <h2>{{selectedSpot.name}}</h2>
        <div class="detail-meta">★{{selectedSpot.rating}} ・ {{categoryMeta[selectedSpot.category].label}} ・ {{selectedSpot.price}}</div>
        <div class="chip-row">
          <span class="tag" v-for="t in selectedSpot.tags" :key="t">{{t}}</span>
        </div>
        <p class="detail-desc">{{selectedSpot.desc}}</p>
        <div class="detail-line">🕐 {{selectedSpot.hours}}</div>
        <div class="detail-line">📍 {{selectedSpot.address}}</div>
        <p class="detail-hint">行きたい度を選ぶとピンが立ちます（＝ルートに追加）</p>
      </div>
      <div class="priority-row bottom-fixed">
        <button class="pbtn absolute big" @click="setPriority(selectedSpot,'absolute')">◎<br>絶対</button>
        <button class="pbtn maybe big" @click="setPriority(selectedSpot,'maybe')">○<br>出来れば</button>
        <button class="pbtn sometime big" @click="setPriority(selectedSpot,'sometime')">△<br>時間あれば</button>
      </div>
    </section>

    <!-- ============ ルートリスト（ポップアップ） ============ -->
    <section v-if="screen==='routeList'" class="screen sheet-overlay" @click.self="back">
      <div class="sheet">
        <div class="sheet-head">
          <span>ルートリスト {{routeListItems.length}}件</span>
          <button class="icon-btn" @click="back">✕</button>
        </div>
        <div class="route-list-item" v-for="s in routeListItems" :key="s.id" @click="openDetail(s)">
          <span class="bar" :style="{background:priorityMeta[s.priority].color}"></span>
          <div>
            <div class="suggest-name">{{s.name}}</div>
            <div class="suggest-sub">{{priorityMeta[s.priority].short}} ・ {{categoryMeta[s.category].label}}</div>
          </div>
          <span class="dots">⋮</span>
        </div>
        <p v-if="!routeListItems.length" class="empty-hint">まだピンがありません</p>
        <button class="btn primary full" @click="openRouteSetup">✈ 最適ルート作成</button>
      </div>
    </section>

    <!-- ============ 出発前設定 (1b) ============ -->
    <section v-if="screen==='routeSetup'" class="screen">
      <div class="header-row">
        <button class="icon-btn" @click="back">‹</button>
        <div class="result-title">ルート作成</div>
        <button class="icon-btn" @click="screen='home'; history=[]">✕</button>
      </div>
      <div class="setup-body">
        <div class="setup-card">
          <div>📍 現在地・みなと駅前</div>
          <div>🕐 9:41</div>
        </div>
        <div class="chip-row">
          <button class="chip" :class="{active: transportMode==='walk'}" @click="transportMode='walk'">🚶 徒歩</button>
          <button class="chip" :class="{active: transportMode==='transit'}" @click="transportMode='transit'">🚃 電車・バス</button>
          <button class="chip" :class="{active: transportMode==='car'}" @click="transportMode='car'">🚗 車</button>
        </div>

        <div class="slider-block">
          <div class="slider-label">何時まで遊ぶ？ <b>{{endHour}}:00</b></div>
          <input type="range" min="12" max="21" step="1" v-model.number="endHour" class="slider">
          <div class="slider-scale"><span>12時</span><span>15時</span><span>18時</span><span>21時</span></div>
          <div class="slider-result">この時間なら <b>{{includedIds.length}}件</b> / 全{{routeListItems.length}}件中</div>
        </div>

        <p class="section-label">巡る順と滞在時間</p>
        <div class="stay-item" v-for="id in includedIds" :key="id">
          <span class="dot" :style="{background:priorityMeta[spots.find(s=>s.id===id).priority].color}"></span>
          <div class="stay-name">{{spots.find(s=>s.id===id).name}}</div>
          <button class="stepper" @click="adjustStay(id,-5)">−</button>
          <span class="stay-min">{{stayFor(id)}}分</span>
          <button class="stepper" @click="adjustStay(id,5)">＋</button>
        </div>
        <div class="excluded-note" v-if="excludedIds.length">
          ⏱ 時間の都合で {{excludedIds.map(id=>spots.find(s=>s.id===id).name).join('・')}} が入り切りません
        </div>
      </div>
      <button class="btn primary full sticky" @click="confirmRouteCreate">このルートで作成</button>
    </section>

    <!-- ============ 結果画面 (1c/1d) ============ -->
    <section v-if="screen==='routeResult'" class="screen">
      <div class="header-row">
        <button class="icon-btn" @click="screen='home'; history=[]">‹</button>
        <div class="result-title">今日のルート</div>
        <button class="icon-btn" @click="openEdit">編集</button>
      </div>
      <div class="mini-map">
        <template v-for="(t,i) in timeline" :key="t.id">
          <span class="mini-pin" :style="{top:(15+i*16)+'%', left:(20+ (i%2? 50:10) + i*8)+'%'}">{{t.order}}</span>
        </template>
      </div>
      <div class="timeline">
        <div class="timeline-item" v-for="t in timeline" :key="t.id">
          <span class="tl-badge" :style="{background:priorityMeta[t.spot.priority].color}">{{t.order}}</span>
          <div class="tl-body">
            <div class="tl-name">{{t.spot.name}}</div>
            <div class="tl-sub">{{formatTime(t.arriveMin)}}着 ・ 滞在{{stayFor(t.id)}}分</div>
          </div>
        </div>
      </div>
      <div class="excluded-banner" v-for="id in finalExcludedIds" :key="id">
        <div>⏱ 時間の都合で「{{spots.find(s=>s.id===id).name}}」は今回のルートから外れました</div>
        <div class="excluded-actions">
          <button class="btn ghost small" @click="dismissExcluded(id,'today')">今日は諦める</button>
          <button class="btn ghost small" @click="dismissExcluded(id,'later')">明日へ持ち越す</button>
        </div>
      </div>
      <button class="btn primary full sticky" @click="startGuidance">出発する</button>
    </section>

    <!-- ============ ルート編集 (1f) ============ -->
    <section v-if="screen==='edit'" class="screen">
      <div class="header-row">
        <button class="icon-btn" @click="back">‹</button>
        <div class="result-title">ルートを編集</div>
        <button class="icon-btn" @click="applyEdit">完了</button>
      </div>
      <p class="section-label small">ドラッグ代わりに ▲▼ で並べ替え・×で削除</p>
      <div class="edit-item" v-for="(t) in editTimeline" :key="t.id">
        <div class="edit-order-btns">
          <button class="stepper tiny" @click="moveItem(t.id,-1)">▲</button>
          <button class="stepper tiny" @click="moveItem(t.id,1)">▼</button>
        </div>
        <span class="tl-badge" :style="{background:priorityMeta[t.spot.priority].color}">{{t.order}}</span>
        <div class="tl-body">
          <div class="tl-name">{{t.spot.name}} <span class="tl-time">{{formatTime(t.arriveMin)}}</span></div>
          <div class="stay-row">
            <button class="stepper" @click="adjustStay(t.id,-5)">−</button>
            <span class="stay-min">{{stayFor(t.id)}}分</span>
            <button class="stepper" @click="adjustStay(t.id,5)">＋</button>
          </div>
        </div>
        <button class="icon-btn" @click="removeFromEdit(t.id)">✕</button>
      </div>
      <button class="add-spot-btn" @click="showToast('検索画面へは今後接続予定です')">＋ スポットを検索して追加</button>

      <div class="removed-box" v-if="removedIds.length">
        <div class="section-label small">外したピン</div>
        <div class="removed-row" v-for="id in removedIds" :key="id">
          <span>{{spots.find(s=>s.id===id).name}}</span>
          <button class="btn ghost small" @click="restoreToEdit(id)">戻す</button>
        </div>
      </div>

      <div class="impact-bar">
        編集の影響：所要時間 {{editImpactMin>=0? '+':''}}{{editImpactMin}}分
      </div>
      <button class="btn primary full sticky" @click="applyEdit">変更を反映する</button>
    </section>

    <!-- ============ 案内中 (1g) ============ -->
    <section v-if="screen==='guidance' && currentGuideSpot" class="screen">
      <div class="header-row">
        <button class="icon-btn" @click="back">‹</button>
        <div class="result-title">ルート案内中</div>
        <button class="icon-btn" @click="openEdit">編集</button>
      </div>
      <div class="mini-map guide">
        <span class="mini-pin current">{{guidanceIndex+1}}</span>
        <span class="mini-pin" v-if="nextGuideSpot" style="top:55%; left:65%">{{guidanceIndex+2}}</span>
      </div>
      <div class="guide-progress">
        {{guidanceIndex}}/{{finalRouteIds.length}} 完了・次は {{currentGuideSpot.name}}
      </div>
      <div class="guide-sheet">
        <div class="guide-title">
          <span class="tl-badge" :style="{background:priorityMeta[currentGuideSpot.priority].color}">{{guidanceIndex+1}}</span>
          {{currentGuideSpot.name}}
        </div>
        <div class="tl-sub">🚶 徒歩{{TRAVEL_MIN}}分・約{{ (guidanceIndex+2)*150 }}m</div>
        <p class="detail-desc small">{{currentGuideSpot.desc}}</p>
        <div class="chip-row">
          <span class="tag" v-for="t in currentGuideSpot.tags" :key="t">{{t}}</span>
        </div>
        <div class="guide-actions">
          <button class="btn ghost" @click="showToast('写真を保存しました（デモ）')">📷 記録写真をとる</button>
          <button class="btn ghost" @click="showToast('メモ機能は準備中です')">📝 記録メモ</button>
        </div>
        <button class="btn primary full" @click="markVisited">✓ 手動で「行った」にする</button>
        <button class="btn ghost full demo" @click="triggerReroute">⏱ 滞在が伸びた（動的リルートを試す）</button>
      </div>

      <!-- 動的リルート (1e) -->
      <div v-if="showReroute" class="sheet-overlay" @click.self="showReroute=false">
        <div class="sheet">
          <div class="reroute-warn">⚠ このままだと予定通りに回れません<br>
            <span class="tl-sub">{{currentGuideSpot.name}}での滞在が予定より長くなっています</span>
          </div>
          <button class="reroute-option best" @click="chooseRerouteOption('順番を入れ替える')">
            <b>1　順番を入れ替える <span class="badge">おすすめ</span></b>
            <div class="tl-sub">後続の巡回順を最適化 → 到着時刻を調整</div>
          </button>
          <button class="reroute-option" @click="chooseRerouteOption('滞在を少し短くする')">
            <b>2　滞在を少し短くする</b>
            <div class="tl-sub">後半の滞在を各−10分</div>
          </button>
          <button class="reroute-option" @click="chooseRerouteOption('1件を持ち越す')">
            <b>3　1件を持ち越す</b>
            <div class="tl-sub">優先度の低いスポットを明日へ</div>
          </button>
          <button class="link-row" @click="openRerouteSettings">⚙ 並び替えの基準を変える <span class="chev">›</span></button>
          <button class="btn ghost full" @click="chooseRerouteOption('keep')">このままでいい</button>
        </div>
      </div>
    </section>

    <!-- ============ リルートの設定 (1h) ============ -->
    <section v-if="screen==='rerouteSettings'" class="screen">
      <div class="header-row">
        <button class="icon-btn" @click="backFromRerouteSettings">‹</button>
        <div class="result-title">リルートの設定</div>
        <button class="icon-btn text" @click="resetRerouteSettings">リセット</button>
      </div>

      <div class="setup-body scroll-body">

        <p class="section-label">あなたのスタイル</p>
        <p class="section-desc">選んだスタイルに合わせて、下の設定が自動でおすすめに調整されます。</p>
        <div class="style-scroll">
          <button v-for="st in travelStyles" :key="st.key" class="style-card"
                  :class="{active: rs.style===st.key}" @click="rs.style=st.key">
            <div class="style-icon" :style="{background: 'linear-gradient(135deg,'+st.grad[0]+','+st.grad[1]+')', color: st.stroke}">
              {{st.icon}}
              <span class="style-check" v-if="rs.style===st.key">✓</span>
            </div>
            <div class="style-title" :class="{on: rs.style===st.key}">{{st.title}}</div>
            <div class="style-desc-sm">{{st.desc}}</div>
          </button>
        </div>

        <div class="divider-label"><span></span><b>設定（スタイルで自動調整・変更もできます）</b><span></span></div>

        <div>
          <div class="row-between">
            <span class="section-label inline">並び替えの優先順位</span>
            <span class="hint-sm">▲▼で入れ替え</span>
          </div>
          <p class="section-desc">上にあるものほど強く順番に反映されます</p>
          <div class="priority-item" v-for="(p,idx) in rs.priorityOrder" :key="p.key">
            <span class="num-badge" :style="{background: idx<2? '#2E8C78':'#5FA487'}">{{idx+1}}</span>
            <div class="priority-body">
              <div class="priority-label">{{p.label}}</div>
              <div class="priority-bar-track"><div class="priority-bar-fill" :style="{width:p.weight+'%', background: idx<2? '#2E8C78':'#5FA487'}"></div></div>
            </div>
            <div class="edit-order-btns">
              <button class="stepper tiny" @click="movePriority(idx,-1)">▲</button>
              <button class="stepper tiny" @click="movePriority(idx,1)">▼</button>
            </div>
          </div>
        </div>

        <div class="toggle-row card-row">
          <div>
            <div class="toggle-title">フルカスタマイズ</div>
            <div class="toggle-desc">ONにすると、設定できる項目が増えます</div>
          </div>
          <button class="toggle-switch" :class="{on: rs.fullCustom}" @click="rs.fullCustom=!rs.fullCustom"><span class="knob"></span></button>
        </div>

        <template v-if="rs.fullCustom">
          <div class="scroll-hint">↓ フルカスタマイズで増えた項目</div>

          <div class="card">
            <p class="card-title">重視するポイント</p>
            <div class="toggle-row bordered">
              <div><div class="toggle-title sm">予算内におさめる</div><div class="toggle-desc">合計の目安：〜{{rs.budgetYen.toLocaleString()}}円</div></div>
              <button class="toggle-switch" :class="{on: rs.points.budget}" @click="togglePoint('budget')"><span class="knob"></span></button>
            </div>
            <div class="toggle-row bordered">
              <div><div class="toggle-title sm">天気で屋内・屋外を調整</div><div class="toggle-desc">雨予報なら屋内スポットを前に</div></div>
              <button class="toggle-switch" :class="{on: rs.points.weather}" @click="togglePoint('weather')"><span class="knob"></span></button>
            </div>
            <div class="toggle-row bordered">
              <div><div class="toggle-title sm">写真映えスポットを優先</div><div class="toggle-desc">夕景などの時間帯も考慮</div></div>
              <button class="toggle-switch" :class="{on: rs.points.photogenic}" @click="togglePoint('photogenic')"><span class="knob"></span></button>
            </div>
            <div class="toggle-row bordered">
              <div><div class="toggle-title sm">営業時間・L.O.を厳守</div><div class="toggle-desc">閉店・ラストオーダーに間に合う順</div></div>
              <button class="toggle-switch" :class="{on: rs.points.hours}" @click="togglePoint('hours')"><span class="knob"></span></button>
            </div>
            <div class="toggle-row bordered last">
              <div><div class="toggle-title sm">空いている時間を狙う</div><div class="toggle-desc">人気店は混雑ピークを外す</div></div>
              <button class="toggle-switch" :class="{on: rs.points.offpeak}" @click="togglePoint('offpeak')"><span class="knob"></span></button>
            </div>
          </div>

          <div class="card">
            <p class="card-title">食事と休憩</p>
            <p class="field-label">ランチの時間を確保</p>
            <div class="chip-row wrap">
              <button v-for="o in lunchOptions" :key="o" class="chip sm" :class="{active: rs.lunch===o}" @click="rs.lunch=o">{{o}}</button>
            </div>
            <p class="field-label">ディナーの時間を確保</p>
            <div class="chip-row wrap">
              <button v-for="o in dinnerOptions" :key="o" class="chip sm" :class="{active: rs.dinner===o}" @click="rs.dinner=o">{{o}}</button>
            </div>
            <div class="row-between"><span class="field-label">休憩をはさむ間隔</span><span class="value-sm">{{rs.breakInterval}}</span></div>
            <div class="chip-row wrap">
              <button v-for="o in breakOptions" :key="o" class="chip sm" :class="{active: rs.breakInterval===o}" @click="rs.breakInterval=o">{{o}}</button>
            </div>
          </div>

          <div class="card">
            <p class="card-title">移動の条件</p>
            <p class="field-label">移動手段</p>
            <div class="chip-row wrap">
              <button v-for="o in transportOptions2" :key="o.key" class="chip sm" :class="{active: rs.transport2===o.key}" @click="rs.transport2=o.key">{{o.label}}</button>
            </div>
            <div class="row-between"><span class="field-label">1日に歩ける距離</span><span class="value-sm">〜{{rs.walkDistanceKm}}km</span></div>
            <input type="range" min="2" max="10" step="1" v-model.number="rs.walkDistanceKm" class="slider">
            <div class="slider-scale"><span>2km</span><span>6km</span><span>10km+</span></div>
            <div class="row-between" style="margin-top:14px"><span class="field-label">1区間の最大移動時間</span><span class="value-sm">{{rs.maxSegmentMin}}分</span></div>
            <input type="range" min="10" max="60" step="5" v-model.number="rs.maxSegmentMin" class="slider">
            <div class="slider-scale"><span>10分</span><span>30分</span><span>60分</span></div>
          </div>

          <div class="card">
            <p class="card-title">固定したい場所</p>
            <div class="fixed-row">
              <span class="field-label">最初に行く</span>
              <span class="value-link">{{rs.fixFirst}} ›</span>
            </div>
            <div class="fixed-row bordered">
              <span class="field-label">最後に行く</span>
              <span class="value-muted">{{rs.fixLast || '指定なし'}} ›</span>
            </div>
            <div class="fixed-row bordered col">
              <span class="field-label">必ず立ち寄る</span>
              <div class="chip-row wrap">
                <span class="chip sm active" v-for="m in rs.mustVisit" :key="m">{{m}} ✕</span>
                <button class="chip sm dashed" @click="showToast('スポット検索は準備中です')">＋ 追加</button>
              </div>
            </div>
          </div>

          <div class="card">
            <p class="card-title">リルートの動き</p>
            <div class="toggle-row bordered">
              <div><div class="toggle-title sm">自動でリルートを提案</div><div class="toggle-desc">予定とのズレを検知したら知らせる</div></div>
              <button class="toggle-switch" :class="{on: rs.autoSuggest}" @click="rs.autoSuggest=!rs.autoSuggest"><span class="knob"></span></button>
            </div>
            <p class="field-label" style="margin-top:12px">提案の積極度</p>
            <div class="segmented">
              <button v-for="o in ['控えめ','標準','積極的']" :key="o" class="seg-btn" :class="{active: (o==='標準'?'standard':o)===rs.aggressiveness}" @click="rs.aggressiveness=(o==='標準'?'standard':o)">{{o}}</button>
            </div>
            <div class="row-between" style="margin-top:14px"><span class="field-label">提案を出すズレの大きさ</span><span class="value-sm">{{rs.triggerThresholdMin}}分から</span></div>
            <input type="range" min="5" max="30" step="5" v-model.number="rs.triggerThresholdMin" class="slider">
            <div class="slider-scale"><span>5分</span><span>15分</span><span>30分</span></div>
            <div class="toggle-row bordered" style="margin-top:14px">
              <div><div class="toggle-title sm">到着を自動で判定</div><div class="toggle-desc">近くに一定時間いると訪問済みに</div></div>
              <button class="toggle-switch" :class="{on: rs.autoArrival}" @click="rs.autoArrival=!rs.autoArrival"><span class="knob"></span></button>
            </div>
            <p class="field-label" style="margin-top:12px">到着判定の感度</p>
            <div class="segmented">
              <button v-for="o in ['ゆるめ','標準','きっちり']" :key="o" class="seg-btn" :class="{active: (o==='標準'?'standard':o)===rs.arrivalSensitivity}" @click="rs.arrivalSensitivity=(o==='標準'?'standard':o)">{{o}}</button>
            </div>
          </div>
        </template>

      </div>
      <button class="btn primary full sticky" @click="confirmRerouteSettings">この設定で並び替える</button>
    </section>

    <!-- ============ 旅のあと (1j) ============ -->
    <section v-if="screen==='afterTrip'" class="screen">
      <div class="header-row">
        <div class="result-title">今日のプラン ふりかえり</div>
      </div>
      <div class="detail-body">
        <p class="section-label">このルートはどうだった？</p>
        <div class="stars">
          <span v-for="n in 5" :key="n" class="star" :class="{on: n<=tripRating}" @click="tripRating=n">★</span>
        </div>
        <div class="chip-row">
          <button v-for="(v,tag) in tripTags" :key="tag" class="chip" :class="{active:v}" @click="toggleTripTag(tag)">{{tag}}</button>
        </div>

        <p class="section-label">周れなかったピンの整理</p>
        <div class="removed-row" v-for="id in finalExcludedIds" :key="id">
          <span>{{spots.find(s=>s.id===id).name}}</span>
          <button class="btn ghost small" @click="dismissExcluded(id,'later')">今度行きたい</button>
        </div>
        <p v-if="!finalExcludedIds.length" class="empty-hint">今回はすべて周れました 🎉</p>

        <p class="section-label">周った場所</p>
        <div class="removed-row" v-for="id in finalRouteIds" :key="id">
          <span>✓ {{spots.find(s=>s.id===id).name}}</span>
          <button class="btn ghost small" @click="showToast('レビュー機能は準備中です')">レビュー</button>
        </div>
      </div>
      <button class="btn primary full sticky" @click="submitTrip">ルートを投稿する</button>
    </section>

    <!-- ============ トースト ============ -->
    <transition name="fade">
      <div v-if="toastMsg" class="toast">{{toastMsg}}</div>
    </transition>

  </div>
  `,
}).mount('#app');
