// EMAILJS
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

const RESTAURANT_EMAIL = 'restaurant@example.com';
const FORCE_OPEN = false; // Sæt til false inden siden går live

if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

function sendOrderConfirmationEmail({ navn, email, ordreNr, items, subtotal, delivery, discount, total, leveringType, adresse }) {
  if (typeof emailjs === 'undefined' || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') return;
  const itemsText = items.map(v =>
    `${v.name.replace(/^\d+[A-Za-z]?\.\s*/, '')} ×${v.qty}  —  ${v.price * v.qty} kr.`
  ).join('\n');

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_name:       navn,
    to_email:      email,
    ordre_nr:      ordreNr,
    ordre_items:   itemsText,
    levering_type: leveringType === 'levering' ? `Levering til: ${adresse}` : 'Afhentning i restauranten',
    subtotal:      subtotal + ' kr.',
    rabat:         discount ? '−' + discount + ' kr.' : '—',
    levering_pris: delivery ? delivery + ' kr.' : 'Gratis',
    total:         total + ' kr.',
    restaurant:    'La Pronto — Lemvigvej 97, 9220 Aalborg — (+45) 98 15 46 40',
  }).catch(() => {}); // silent fail — order still goes through
}

function sendRestaurantReceiptEmail({ navn, telefon, ordreNr, items, subtotal, delivery, discount, total, leveringType, adresse, kommentar }) {
  if (typeof emailjs === 'undefined' || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') return;
  const now = new Date();
  const tidspunkt = now.toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' });
  const linje = '─────────────────────────────';
  const itemsText = items.map(v =>
    `  ${v.name.replace(/^\d+[A-Za-z]?\.\s*/, '')} × ${v.qty}`.padEnd(32) + `${v.price * v.qty} kr.`
  ).join('\n');
  const receipt = [
    '★ NY ORDRE — LA PRONTO ★',
    linje,
    `Ordrenr: ${ordreNr}`,
    `Tidspunkt: ${tidspunkt}`,
    linje,
    `Kunde: ${navn}`,
    `Telefon: ${telefon || '—'}`,
    leveringType === 'levering' ? `Levering til: ${adresse}` : 'Afhentning i restauranten',
    kommentar ? `Bemærkning: ${kommentar}` : '',
    linje,
    itemsText,
    linje,
    `Subtotal:`.padEnd(28) + `${subtotal} kr.`,
    delivery ? `Levering:`.padEnd(28) + `${delivery} kr.` : '',
    discount ? `Rabat:`.padEnd(28) + `−${discount} kr.` : '',
    `TOTAL:`.padEnd(28) + `${total} kr.`,
    linje,
  ].filter(Boolean).join('\n');

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_name:       'La Pronto — Køkken',
    to_email:      RESTAURANT_EMAIL,
    ordre_nr:      ordreNr,
    ordre_items:   receipt,
    levering_type: leveringType === 'levering' ? `Levering til: ${adresse}` : 'Afhentning',
    subtotal:      subtotal + ' kr.',
    rabat:         discount ? '−' + discount + ' kr.' : '—',
    levering_pris: delivery ? delivery + ' kr.' : 'Gratis',
    total:         total + ' kr.',
    restaurant:    'La Pronto — Lemvigvej 97, 9220 Aalborg',
  }).catch(() => {});
}

let menuData = {};

const KAT_ORDER = [
  'Pizza', 'Durum', 'LimitedEdition', 'Grill', 'Børnemenu',
  'Pasta', 'Salater', 'Desserter', 'Hjemmelavet Chilli', 'Drikkevarer'
];

const katEmoji = {
  Pizza:'🍕', Durum:'🌯', Grill:'🍖', Børnemenu:'🧒',
  Pasta:'🍝', Salater:'🥗', Drikkevarer:'🥤', Desserter:'🍰',
  'Hjemmelavet Chilli':'🌶️'
};

const katDefaultImg = {
  LimitedEdition: 'images/taquitos.png',
  Pizza:          'images/pizza-category.jpg',
  Durum:          'images/durum-category.png',
  Grill:          'images/grill-category.jpg',
  Børnemenu:      'images/bornemenu-category.jpg',
  Pasta:          'images/pasta-80-bolognese.jpg',
  Salater:        'images/salat-greek.jpg',
  Drikkevarer:    'images/cola.webp',
  Desserter:      'images/pizza-52-nutella.jpeg',
  'Hjemmelavet Chilli': 'images/hjemmelavet-chilli.jpg'
};

function buildSidebarNav() {
  const ul = document.getElementById('sidebar-nav');
  if (!ul || !menuData) return;
  const isEN = getLang() === 'en';
  ul.innerHTML = KAT_ORDER.filter(k => menuData[k]).map(kat => {
    const isActive = kat === (window._currentKat || 'Pizza');
    const label = translateKat(kat);
    const safeKat = kat.replace(/'/g, "\\'");
    return `<li><a href="#" onclick="filtrerKat('${safeKat}',null,this);return false;"${isActive ? ' class="aktiv"' : ''}>${label}</a></li>`;
  }).join('');

  const sel = document.getElementById('kat-select-mobil');
  if (sel) {
    const cur = sel.value || window._currentKat || 'Pizza';
    sel.innerHTML = KAT_ORDER.filter(k => menuData[k]).map(kat =>
      `<option value="${kat}"${kat === cur ? ' selected' : ''}>${translateKat(kat)}</option>`
    ).join('');
  }
}

function buildKatGrid() {
  const grid = document.querySelector('.kat-gitter');
  if (!grid || !menuData) return;
  grid.innerHTML = KAT_ORDER.filter(kat => menuData[kat]).map(kat => {
    const isLE  = kat === 'LimitedEdition';
    const items = menuData[kat] || [];
    const img   = katDefaultImg[kat] || items.find(i => i.img && !i.gruppe)?.img || 'images/pizza-category.jpg';
    const name  = translateKat(kat);
    const safeKat = kat.replace(/'/g, "\\'");
    return `<a class="kat-kort${isLE ? ' kat-kort-limited' : ''}" data-kat="${kat.replace(/"/g,'&quot;')}" href="${isLE ? '#menu' : '#'}" onclick="visSide('menu'); filtrerKat('${safeKat}'); return false;">
      <div class="kat-kort-foto">
        ${isLE ? '<span class="limited-ny-badge">NY!</span>' : ''}
        <img src="${img}" alt="${name}" ${isLE ? 'class="foto-cover"' : ''} loading="lazy">
        ${isLE ? `<span class="le-banner">🔥 ${t('Prøv det nye!', 'Exclusive Drop!')}</span>` : ''}
      </div>
      <span class="kat-kort-navn">${name}</span>
    </a>`;
  }).join('');
}

// TRANSLATION HELPERS
function getLang() { return localStorage.getItem('lp-lang') || 'da'; }
function t(da, en) { return getLang() === 'en' ? en : da; }

const KAT_EN = {
  'LimitedEdition': 'Limited Edition',
  'Børnemenu': "Children's Menu", 'Salater': 'Salads',
  'Drikkevarer': 'Drinks', 'Desserter': 'Desserts',
  'Durum': 'Durum', 'Grill': 'Grill', 'Pasta': 'Pasta',
  'Hjemmelavet Chilli': 'Homemade Chilli'
};
const KAT_DA = { 'LimitedEdition': 'Limited Edition' };
function translateKat(kat) { return getLang() === 'en' ? (KAT_EN[kat] || KAT_DA[kat] || kat) : (KAT_DA[kat] || kat); }

const GRUPPE_EN = {
  'Klassisk': 'Classic', 'Special': 'Special', 'Vegetar': 'Vegetarian',
  'Indbagt': 'Baked-in', 'Tilbehør': 'Sides', 'Grillretter': 'Grill dishes',
  'Burgere': 'Burgers', 'Snacks': 'Snacks'
};
function translateGruppe(g) { return getLang() === 'en' ? (GRUPPE_EN[g] || g) : g; }

const DA_EN_MAP = [
  [/\bTomat\b/g,'Tomato'],[/\btomat\b/g,'tomato'],
  [/\bOst\b/g,'Cheese'],[/\bost\b/g,'cheese'],
  [/\bSkinke\b/g,'Ham'],[/\bskinke\b/g,'ham'],
  [/\bChampignon\b/gi,'Mushrooms'],[/\bchampignon\b/gi,'mushrooms'],
  [/\bRød peber\b/gi,'Red pepper'],
  [/\bLøg\b/g,'Onion'],[/\bløg\b/g,'onion'],
  [/\bOksekød\b/g,'Beef'],[/\boksekød\b/g,'beef'],
  [/\bKyllingefilet\b/gi,'Chicken fillet'],
  [/\bKyllingespyd\b/gi,'Chicken skewers'],
  [/\bKylling\b/g,'Chicken'],[/\bkylling\b/g,'chicken'],
  [/\bRejer\b/g,'Shrimps'],[/\brejer\b/g,'shrimps'],
  [/\bMuslinger\b/g,'Mussels'],[/\bmuslinger\b/g,'mussels'],
  [/\bHvidløg\b/g,'Garlic'],[/\bhvidløg\b/g,'garlic'],
  [/\bAnanas\b/g,'Pineapple'],[/\bananas\b/g,'pineapple'],
  [/\bArtiskok\b/g,'Artichoke'],[/\bartiskok\b/g,'artichoke'],
  [/\bOliven\b/g,'Olives'],[/\boliven\b/g,'olives'],
  [/\bMajs\b/g,'Corn'],[/\bmajs\b/g,'corn'],
  [/\bTunfisk\b/g,'Tuna'],[/\btunfisk\b/g,'tuna'],
  [/\bPølser\b/g,'Sausages'],[/\bpølser\b/g,'sausages'],
  [/\bBearnaisesauce\b/gi,'Béarnaise sauce'],
  [/\bAnsjoser\b/g,'Anchovies'],[/\bansjoser\b/g,'anchovies'],
  [/\bFrisk salat\b/gi,'Fresh lettuce'],
  [/\bFrisk tomat\b/gi,'Fresh tomato'],
  [/\bFrisk\b/g,'Fresh'],[/\bfrisk\b/g,'fresh'],
  [/\bAgurk\b/g,'Cucumber'],[/\bagurk\b/g,'cucumber'],
  [/\bSpinat\b/g,'Spinach'],[/\bspinat\b/g,'spinach'],
  [/\bFeta ost\b/gi,'Feta cheese'],
  [/\bSalat ost\b/gi,'Salad cheese'],
  [/\bKødsauce\b/g,'Meat sauce'],[/\bkødsauce\b/g,'meat sauce'],
  [/\bSurimi krabbe\b/gi,'Surimi crab'],
  [/\bKrabbekød\b/g,'Crab meat'],[/\bkrabbekød\b/g,'crab meat'],
  [/\bKarry\b/g,'Curry'],[/\bkarry\b/g,'curry'],
  [/\bÆg\b/g,'Egg'],[/\bæg\b/g,'egg'],
  [/\bFlødesauce\b/g,'Cream sauce'],[/\bflødesauce\b/g,'cream sauce'],
  [/\bParmasan\b/gi,'Parmesan'],[/\bParmesan\b/g,'Parmesan'],
  [/\bFlutes\b/g,'Baguette'],[/\bflutes\b/g,'baguette'],
  [/\bPommes frites\b/gi,'French fries'],
  [/\bPommes skiver\b/gi,'Potato slices'],
  [/\bRemoulade\b/g,'Remoulade'],[/\bremoulade\b/g,'remoulade'],
  [/\bHjemmelavet\b/g,'Homemade'],[/\bhjemmelavet\b/g,'homemade'],
  [/\bHusets\b/g,'House'],[/\bhusets\b/g,'house'],
  [/\bIndbagte blæksprutteringe\b/gi,'Battered squid rings'],
  [/\bFiskefilet\b/g,'Fish fillet'],[/\bfiskefilet\b/g,'fish fillet'],
  [/\bSkinkeschnitzel\b/gi,'Ham schnitzel'],
  [/\bHakkebøf\b/gi,'Beef patty'],
  [/\bTacokrydderi\b/gi,'Taco seasoning'],
  [/\bPastaplader\b/gi,'Pasta sheets'],
  [/\bStilles\b/g,'Still'],[/\bEnergidrik\b/g,'Energy drink'],
  [/\bKold flaske\b/gi,'Cold bottle'],[/\bKold dåse\b/gi,'Cold can'],
  [/\bStor flaske\b/gi,'Large bottle'],[/\bLille\b/g,'Small'],
  [/\bstk\.\b/g,'pcs.'],
  [/\bDrysset med\b/gi,'Sprinkled with'],
  [/\bel\.\b/g,'or'],
  [/\bBørnespaghetti\b/gi,"Children's Spaghetti"],
  [/\bBørne/g,"Children's "],
  [/\bTunsalat\b/gi,'Tuna salad'],[/\bRejesalat\b/gi,'Shrimp salad'],
  [/\bKrabbesalat\b/gi,'Crab salad'],[/\bKyllingesalat\b/gi,'Chicken salad'],
  [/\bFalafelsalat\b/gi,'Falafel salad'],[/\bGræsk salat\b/gi,'Greek salad'],
  [/\bSalat\b/g,'Salad'],[/\bsalat\b/g,'salad'],
  [/\bHvidvin\b/gi,'white wine'],[/\bRødvin\b/gi,'red wine'],
  [/\bVand\b/g,'Water'],[/\bvand\b/g,'water'],
  [/\bServeret i bæger\b/gi,'Served in a cup'],
  [/\bi bæger\b/gi,'in a cup'],[/\bbæger\b/gi,'cup'],
  [/\bFalafel\b/g,'Falafel'],
  [/\bPesto\b/gi,'pesto'],[/\bChokoladesauce\b/gi,'chocolate sauce'],
  [/\bJordbær\b/gi,'Strawberry'],[/\bjordbær\b/gi,'strawberry'],
  [/\bFløde\b/g,'Cream'],[/\bfløde\b/g,'cream'],
  [/\bOregano\b/gi,'oregano'],
];
function translateDesc(text) {
  if (getLang() !== 'en' || !text) return text;
  let r = text;
  for (const [pat, rep] of DA_EN_MAP) r = r.replace(pat, rep);
  return r;
}

window._currentKat = 'Pizza';

// Menu data is now loaded from menu.json — no localStorage overrides
function ep(navn, defaultPris)        { return defaultPris; }
function eb(navn, defaultBeskrivelse) { return defaultBeskrivelse; }
function ei(navn, defaultImg)         { return defaultImg; }

function showPage(id) { visSide(id); }

const STICKY_CTA_SIDER = ['hjem', 'kontakt'];
function visSide(id, pushState = true) {
  const bw = document.querySelector('.bekraeftelse-wrapper');
  if (bw) bw.classList.remove('go');
  document.querySelectorAll('.side').forEach(s => s.classList.remove('aktiv'));
  document.getElementById('side-' + id).classList.add('aktiv');
  window.scrollTo(0, 0);
  if (pushState) history.pushState({ side: id }, '', '#' + id);
  const stickyCta = document.querySelector('.sticky-cta');
  if (stickyCta) stickyCta.classList.toggle('sticky-cta-skjult', !STICKY_CTA_SIDER.includes(id));
  return false;
}

window.addEventListener('popstate', function(e) {
  const id = (e.state && e.state.side) || 'hjem';
  visSide(id, false);
});

history.replaceState({ side: 'hjem' }, '', location.pathname + location.search);

function filtrerKat(kat, _unused, sidebarEl) {
  window._currentKat = kat;
  window._currentFilter = null;
  const display = translateKat(kat);
  document.querySelectorAll('#sidebar-nav a').forEach(a => a.classList.remove('aktiv'));
  if (sidebarEl) {
    sidebarEl.classList.add('aktiv');
  } else {
    document.querySelectorAll('#sidebar-nav a').forEach(a => {
      if (a.textContent.includes(kat) || a.textContent.includes(display)) a.classList.add('aktiv');
    });
  }
  const sel = document.getElementById('kat-select-mobil');
  if (sel) sel.value = kat;
  showMenuItems(kat);
  setTimeout(observeGroupHeaders, 50);
}

function applyFilter(gruppe) {
  window._currentFilter = gruppe;
  showMenuItems(window._currentKat);
}

function showMenuItems(cat) {
  const rawItems = [...(menuData[cat] || [])].filter(item => item.gruppe || !item.hidden);
  const el = document.getElementById('menu-indhold');
  const catImg = {LimitedEdition:'images/taquitos.png',Pizza:'images/pizza-category.jpg',Durum:'images/durum-shawarma-hero.avif',Grill:'images/grill-category.jpg',Pasta:'images/pasta-80-bolognese.jpg',Salater:'images/salat-greek.jpg',Drikkevarer:'images/cola.webp',Børnemenu:'images/bornemenu-category.jpg',Desserter:'images/no-image.png','Hjemmelavet Chilli':'images/hjemmelavet-chilli.jpg'}[cat]||'images/pizza-category.jpg';
  const alcoholNotice = cat === 'Drikkevarer' ? `
    <div class="alkohol-notice">
      <span><strong>${t('Alkohol','Alcohol')}</strong> — ${t('kun muligt ved takeaway og levering. Må ikke serveres i restauranten ifm. lov om restaurationsvirksomhed og alkoholbevilling.','only available for takeaway and delivery. May not be served in the restaurant under Danish licensing law.')}</span>
    </div>` : '';

  let curGruppe = null;
  const enriched = rawItems.map(item => {
    if (item.gruppe) { curGruppe = item.gruppe; }
    return { ...item, _gruppe: curGruppe };
  });

  const allGroups = [...new Set(enriched.filter(r => r.gruppe).map(r => r.gruppe))];
  const activeFilter = window._currentFilter || null;

  const items = activeFilter
    ? enriched.filter(item => !item.gruppe && item._gruppe === activeFilter)
    : enriched;

  const count = items.filter(r => !r.gruppe).length;
  const filterLabel = activeFilter ? ` <span class="menu-filter-aktiv">— ${translateGruppe(activeFilter)}</span>` : '';

  const filterPills = allGroups.length ? `
    <div class="menu-filter-pills">
      <button class="filter-pill${!activeFilter ? ' aktiv' : ''}" onclick="applyFilter(null)">${t('Alle','All')}</button>
      ${allGroups.map(g => `<button class="filter-pill${activeFilter === g ? ' aktiv' : ''}" onclick="applyFilter('${g.replace(/'/g,"\\'")}')">${translateGruppe(g)}</button>`).join('')}
    </div>` : '';

  const allFeatured = cat === 'LimitedEdition' ? [] : enriched.filter(r => !r.gruppe && (r.populaer || r.anbefalet || r.ny));
  const featured = activeFilter ? allFeatured.filter(r => r._gruppe === activeFilter) : allFeatured;
  const featuredHTML = featured.length ? `
    <div class="menu-featured">
      <div class="menu-featured-titel">${t('Populære valg','Popular choices')}</div>
      ${featured.map(item => {
        const numMatch = item.navn.match(/^(\d+[A-Za-z]?\.\s*)/);
        const numPrefix = numMatch ? `<span class="item-num">${numMatch[1].trim()}</span> ` : '';
        const displayName = numPrefix + translateDesc(item.navn.replace(/^\d+[A-Za-z]?\.\s*/, ''));
        const tag = item.ny ? `<span class="item-tag tag-ny">${t('Ny','New')}</span>` : item.populaer ? `<span class="item-tag tag-popular">${t('Populær','Popular')}</span>` : `<span class="item-tag tag-anbefalet">${t('Anbefalet','Recommended')}</span>`;
        const _p = ep(item.navn, item.pris); const _b = eb(item.navn, item.beskrivelse||''); const _i = ei(item.navn, item.img||catImg);
        const sub2 = _b ? `<span class="item-dash"> — </span><span class="item-sub">${translateDesc(_b)}</span>` : '';
        const _modalArgs = `'${item.navn.replace(/'/g,"\\'")}',${_p},'${_b.replace(/'/g,"\\'")}','${_i}',${(cat==='Pizza'||cat==='Desserter') && !item.noFamilie},${cat==='Grill'},${!!item.noToppings},${!(cat==='Drikkevarer'||cat==='Salater'||cat==='Pasta')},${cat==='Børnemenu' && !item.noToppings}`;
        const _customizable = ((cat==='Pizza'||cat==='Desserter') && !item.noFamilie) || cat==='Grill' || (cat==='Børnemenu' && !item.noToppings);
        const _knap = _customizable
          ? `<button class="tilføj-knap" onclick="event.stopPropagation();openProductModal(${_modalArgs})" title="${t('Tilpas og tilføj','Customise and add')}">+</button>`
          : `<button class="tilføj-knap" onclick="event.stopPropagation();addToCart('${item.navn.replace(/'/g,"\\'")}',${_p})" title="${t('Tilføj til kurv','Add to cart')}">+</button>`;
        const _poseNote = kraeverPlastikpose(item.navn) ? `<span class="item-pose-note">${t(`+ ${PLASTIKPOSE_PRIS} kr. lovpligtig pose`, `+ ${PLASTIKPOSE_PRIS} kr. mandatory bag`)}</span>` : '';
        return `<div class="menu-item menu-item-featured" onclick="openProductModal(${_modalArgs})">
          <img class="item-thumb" src="${_i}" alt="" loading="lazy" onerror="this.style.display='none'" ${item.mørk ? 'style="mix-blend-mode:multiply;"' : ''}>
          <div class="item-left"><span class="item-navn">${displayName}</span>${sub2}${tag}${_poseNote}</div>
          <div class="item-right"><span class="item-pris">${_p} kr.</span>
            ${_knap}
          </div></div>`;
      }).join('')}
    </div>` : '';

  el.innerHTML = `
    <div class="menu-sektion-titel">${translateKat(cat)}${filterLabel}</div>
    <div class="menu-resultat-antal">${t(`Viser ${count} resultater`,`Showing ${count} results`)}</div>
    ${filterPills}
    ${featuredHTML}
    ${alcoholNotice}
    ${items.map(item => {
      if (item.gruppe) return `<div class="menu-gruppe-overskrift" id="gruppe-${item.gruppe}">${translateGruppe(item.gruppe)}</div>`;
      const numMatch = item.navn.match(/^(\d+[A-Za-z]?\.\s*)/);
      const numPrefix = numMatch ? `<span class="item-num">${numMatch[1].trim()}</span> ` : '';
      const displayName = numPrefix + translateDesc(item.navn.replace(/^\d+[A-Za-z]?\.\s*/, ''));
      const _ep = ep(item.navn, item.pris); const _eb = eb(item.navn, item.beskrivelse||''); const _ei = ei(item.navn, item.img||catImg);
      const sub = _eb ? `<span class="item-dash"> — </span><span class="item-sub">${translateDesc(_eb)}</span>` : '';
      const limitedBadge = (item.limitedEdition && cat !== 'LimitedEdition') ? `<span class="tag-limited">Limited Edition</span>` : '';
      const tag = item.ny         ? `<span class="item-tag tag-ny">${t('Ny','New')}</span>`
                : item.populaer  ? `<span class="item-tag tag-popular">${t('Populær','Popular')}</span>`
                : item.anbefalet ? `<span class="item-tag tag-anbefalet">${t('Anbefalet','Recommended')}</span>` : '';
      const _modalArgs = `'${item.navn.replace(/'/g,"\\'")}',${_ep},'${_eb.replace(/'/g,"\\'")}','${_ei}',${(cat==='Pizza'||cat==='Desserter') && !item.noFamilie},${cat==='Grill'},${!!item.noToppings},${!(cat==='Drikkevarer'||cat==='Salater'||cat==='Pasta')},${cat==='Børnemenu' && !item.noToppings}`;
      const _customizable = ((cat==='Pizza'||cat==='Desserter') && !item.noFamilie) || cat==='Grill' || (cat==='Børnemenu' && !item.noToppings);
      const _knap = _customizable
        ? `<button class="tilføj-knap" onclick="event.stopPropagation();openProductModal(${_modalArgs})" title="${t('Tilpas og tilføj','Customise and add')}">+</button>`
        : `<button class="tilføj-knap" onclick="event.stopPropagation();addToCart('${item.navn.replace(/'/g,"\\'")}', ${_ep})" title="${t('Tilføj til kurv','Add to cart')}">+</button>`;
      const _poseNote = kraeverPlastikpose(item.navn) ? `<span class="item-pose-note">${t(`+ ${PLASTIKPOSE_PRIS} kr. lovpligtig pose`, `+ ${PLASTIKPOSE_PRIS} kr. mandatory bag`)}</span>` : '';
      return `
      <div class="menu-item${item.limitedEdition ? ' limited-item' : ''}" onclick="openProductModal(${_modalArgs})">
        ${!item.noImg ? `<img class="item-thumb" src="${_ei}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="item-left">
          <span class="item-navn">${displayName}${limitedBadge}</span>${sub}${tag}${_poseNote}
        </div>
        <div class="item-right">
          <span class="item-pris">${_ep} kr.</span>
          ${_knap}
        </div>
      </div>`;
    }).join('')}
  `;
  const searchEl = document.getElementById('menu-search');
  if (searchEl) { searchEl.value = ''; filterMenu(''); }
}

function filterMenu(q) {
  const term = q.toLowerCase().trim();
  let visibleCount = 0;
  document.querySelectorAll('#menu-indhold .menu-item').forEach(item => {
    const matches = !term || item.textContent.toLowerCase().includes(term);
    item.classList.toggle('menu-item-hidden', !matches);
    if (matches) visibleCount++;
  });
  const tomEl = document.getElementById('menu-search-tom');
  if (tomEl) {
    if (term && visibleCount === 0) {
      tomEl.style.display = '';
      tomEl.innerHTML = `${t('Intet matcher','Nothing matches')} "<strong>${q.trim().replace(/</g,'&lt;')}</strong>" — ${t('prøv et andet ord, eller','try another word, or')} <a href="#" onclick="document.getElementById('menu-search').value='';filterMenu('');return false;">${t('ryd søgningen','clear the search')}</a>.`;
    } else {
      tomEl.style.display = 'none';
    }
  }
}

// GROUP SUB-NAV
function scrollToGroup(group) {
  const target = document.getElementById('gruppe-' + group);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.subnav-link').forEach(l => {
    l.classList.toggle('aktiv', l.textContent === group);
  });
}

// Highlight active pill on scroll (IntersectionObserver)
const _groupObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const group = e.target.id.replace('gruppe-', '');
      document.querySelectorAll('.subnav-link').forEach(l => {
        l.classList.toggle('aktiv', l.textContent === group);
      });
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

function observeGroupHeaders() {
  _groupObserver.disconnect();
  document.querySelectorAll('.menu-gruppe-overskrift').forEach(el => _groupObserver.observe(el));
}

let cart = [];
let lastOrderItems = [];
let activeCoupon = null;

// Lovpligtig bæreposeafgift — automatisk for varenr. 54-69 (grill/durum-retter) samt unummererede grill-tilbehør
const PLASTIKPOSE_PRIS = 5;
const PLASTIKPOSE_NAVNE = ['Lille Pommes frites', 'Stor Pommes frites'];
function kraeverPlastikpose(navn) {
  if (PLASTIKPOSE_NAVNE.includes(navn)) return true;
  const m = navn.match(/^(\d+)[A-Za-z]?\./);
  if (!m) return false;
  const num = parseInt(m[1], 10);
  return num >= 54 && num <= 69;
}

function addToCart(name, price) {
  let cartName = name;
  let cartPrice = price;
  if (kraeverPlastikpose(name)) {
    cartName = `${name} (+ pose ${PLASTIKPOSE_PRIS} kr.)`;
    cartPrice = price + PLASTIKPOSE_PRIS;
  }
  const existing = cart.find(v => v.name === cartName);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name: cartName, price: cartPrice, qty: 1 });
  }
  updateCartUI();
  showToast(`${name} tilføjet til kurv`);
  const badge = document.getElementById('kurv-badge');
  badge.classList.remove('puls');
  void badge.offsetWidth;
  badge.classList.add('puls');
  setTimeout(() => badge.classList.remove('puls'), 200);
}

function removeFromCart(name) {
  const idx = cart.findIndex(v => v.name === name);
  if (idx === -1) return;
  cart[idx].qty--;
  if (cart[idx].qty <= 0) {
    const removed = cart[idx];
    cart.splice(idx, 1);
    updateCartUI();
    const cleanName = removed.name.replace(/^\d+[A-Za-z]?\.\s*/, '');
    showUndoToast(`${cleanName} fjernet fra kurv`, () => {
      cart.push(removed);
      updateCartUI();
    });
    return;
  }
  updateCartUI();
}

let siteConfig = {
  hours:  { weekdayOpen: '16:00', weekendOpen: '15:30', close: '21:30', onlineClose: '20:30' },
  notice: null
};

function formatPrice(kr) {
  return kr.toFixed(2).replace('.', ',') + ' kr.';
}

function updateCartUI() {
  const total = cart.reduce((sum, v) => sum + v.price * v.qty, 0);
  const count = cart.reduce((sum, v) => sum + v.qty, 0);
  document.getElementById('kurv-badge').textContent = count;
  document.getElementById('kurv-label').textContent = count > 0 ? `Kurv (${count})` : 'Kurv';
  document.getElementById('kurv-total').textContent = total + ' kr.';
  const levHint = document.getElementById('kurv-levering-hint');
  if (levHint) levHint.textContent = total > 600 ? 'Gratis' : count <= 1 ? '50 kr.' : '40 kr.';
  const checkoutBtn = document.querySelector('.checkout-knap');
  if (checkoutBtn) {
    checkoutBtn.disabled = count === 0;
    checkoutBtn.style.opacity = count === 0 ? '0.4' : '1';
    checkoutBtn.style.cursor = count === 0 ? 'not-allowed' : 'pointer';
  }
  const el = document.getElementById('kurv-indhold');
  if (cart.length === 0) {
    el.innerHTML = '<div class="kurv-tom"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 0.6rem;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>Din kurv er tom<br><a href="#" onclick="closeCart(); showPage(\'menu\'); return false;" style="display:inline-block;margin-top:0.75rem;font-size:0.82rem;font-weight:700;color:var(--red);text-decoration:none;">Se menu →</a></div>';
    return;
  }
  const hasDrink   = cart.some(v => menuData.Drikkevarer.find(d => d.navn === v.name));
  const hasSide    = cart.some(v => ['Lille Pommes frites','Stor Pommes frites','67. Pitabrød','68. Hvidløgsbrød'].includes(v.name));
  const hasDessert = cart.some(v => v.name.startsWith('52. Pizza Dolci'));

  const drinkPool = [
    { navn: '33cl Coca-Cola',   pris: 20, img: 'images/cola-33cl.jpg' },
    { navn: '33cl Fanta',       pris: 20, img: 'images/fanta-33cl.jpg' },
    { navn: '33cl Faxe Kondi',  pris: 20, img: 'images/faxe-kondi-dase.jpg' },
    { navn: 'Redbull',          pris: 25, img: 'images/redbull-dase.png' },
  ];
  const sidePool = [
    { navn: 'Lille Pommes frites', pris: 40, img: 'images/grill-pommes.jpg' },
    { navn: '68. Hvidløgsbrød',    pris: 50, img: 'images/grill-hvidlogsbroed.jpg' },
  ];
  const dessertPool = [
    { navn: '52. Pizza Dolci', pris: 85, img: 'images/pizza-52-nutella.jpeg' },
  ];
  const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

  const upsells = [];
  if (!hasDrink)   upsells.push(pickRandom(drinkPool));
  if (!hasSide)    upsells.push(pickRandom(sidePool));
  if (!hasDessert) upsells.push(pickRandom(dessertPool));

  const upsellHTML = upsells.length ? `
    <div class="kurv-upsell">
      <div class="kurv-upsell-titel">Tilføj til din ordre?</div>
      ${upsells.map(u => `
        <div class="kurv-upsell-item">
          <img src="${u.img}" alt="" loading="lazy">
          <span class="kurv-upsell-navn">${u.navn}</span>
          <span class="kurv-upsell-pris">${u.pris} kr.</span>
          <button class="kurv-upsell-knap" onclick="addToCart('${u.navn.replace(/'/g,"\\'")}', ${u.pris})">+ Tilføj</button>
        </div>`).join('')}
    </div>` : '';

  el.innerHTML = cart.map(v => `
    <div class="kurv-vare">
      <div>
        <div class="kurv-vare-navn">${v.name}</div>
        <div class="kurv-vare-pris">${v.price} kr. × ${v.qty} = ${v.price * v.qty} kr.</div>
      </div>
      <div class="antal-kontroller">
        <button class="antal-knap" onclick="removeFromCart('${v.name.replace(/'/g,"\\'")}')">−</button>
        <span class="antal-num">${v.qty}</span>
        <button class="antal-knap" onclick="addToCart('${v.name.replace(/'/g,"\\'")}', ${v.price})">+</button>
      </div>
    </div>
  `).join('') + upsellHTML;
}

function openCart() {
  document.getElementById('kurv-overlay').classList.add('åben');
  document.getElementById('kurv-skuffe').classList.add('åben');
}

function closeCart() {
  document.getElementById('kurv-overlay').classList.remove('åben');
  document.getElementById('kurv-skuffe').classList.remove('åben');
}

function removeAllOfItem(name) {
  const removed = cart.find(v => v.name === name);
  cart = cart.filter(v => v.name !== name);
  updateCartUI();
  showCartPage();
  if (removed) {
    const cleanName = removed.name.replace(/^\d+[A-Za-z]?\.\s*/, '');
    showUndoToast(`${cleanName} fjernet fra kurv`, () => {
      cart.push(removed);
      updateCartUI();
      showCartPage();
    });
  }
}

function calculateCartTotals() {
  const subtotal = cart.reduce((sum, v) => sum + v.price * v.qty, 0);
  const delivery = document.querySelector('input[name="forsendelse"]:checked')?.value || 'afhentning';
  const cartQty = cart.reduce((sum, v) => sum + v.qty, 0);
  const deliveryPrice = delivery === 'levering'
    ? (subtotal > 600 ? 0 : cartQty <= 1 ? 50 : 40)
    : 0;
  const discount = 0;
  const total = subtotal + deliveryPrice;
  const vat = Math.round(total / 1.25 * 0.25);
  const sub = document.getElementById('ks-subtotal');
  const lev = document.getElementById('ks-lev-pris');
  const tot = document.getElementById('ks-total');
  const mom = document.getElementById('ks-moms');
  const discountRow = document.getElementById('ks-rabat-linje');
  const leveringPrisTekst = subtotal > 600 ? 'Gratis' : cartQty <= 1 ? '50,00 kr.' : '40,00 kr.';
  const leveringHint = document.getElementById('levering-hint');
  if (leveringHint) leveringHint.textContent = `(${leveringPrisTekst})`;
  if (sub) sub.textContent = formatPrice(subtotal);
  if (lev) lev.textContent = deliveryPrice ? `→ ${formatPrice(deliveryPrice)}` : '';
  if (tot) tot.textContent = formatPrice(total);
  if (mom) mom.textContent = total > 0 ? `(inkluderer ${formatPrice(vat)} Moms)` : '';
  if (discountRow) {
    discountRow.style.display = discount > 0 ? '' : 'none';
    const rb = document.getElementById('ks-rabat');
    if (rb && discount > 0) rb.textContent = '−' + formatPrice(discount);
  }
}

function updateCartItem(input) {
  const name = input.dataset.navn;
  const newQty = parseInt(input.value, 10);
  const idx = cart.findIndex(v => v.name === name);
  if (idx === -1) return;
  if (isNaN(newQty) || newQty <= 0) {
    const removed = cart[idx];
    cart.splice(idx, 1);
    updateCartUI();
    showCartPage();
    const cleanName = removed.name.replace(/^\d+[A-Za-z]?\.\s*/, '');
    showUndoToast(`${cleanName} fjernet fra kurv`, () => {
      cart.push(removed);
      updateCartUI();
      showCartPage();
    });
    return;
  }
  if (newQty > 50) {
    cart[idx].qty = 50;
    showToast('Maks. 50 stk. pr. vare');
  } else {
    cart[idx].qty = newQty;
  }
  updateCartUI();
  showCartPage();
}

function showCartPage() {
  closeCart();
  const el = document.getElementById('kurv-side-indhold');
  if (cart.length === 0) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem 0;color:var(--gray);">Din kurv er tom. <a href="#" onclick="showPage(\'menu\');return false;" style="color:var(--red);font-weight:600;">Se menu →</a></div>';
    showPage('kurv');
    return;
  }
  el.innerHTML = `
    <div class="kurv-venstre">
      <table class="kurv-tabel">
        <thead><tr>
          <th class="th-fjern"></th>
          <th class="th-billede"></th>
          <th>Vare</th>
          <th>Pris</th>
          <th>Antal</th>
          <th>Subtotal</th>
        </tr></thead>
        <tbody>
          ${cart.map(v => `<tr>
            <td class="td-fjern"><button class="kurv-rad-fjern" onclick="removeAllOfItem('${v.name.replace(/'/g,"\\'")}')">×</button></td>
            <td class="td-billede"></td>
            <td><span class="kurv-rad-navn">${v.name}</span></td>
            <td class="kurv-rad-pris">${formatPrice(v.price)}</td>
            <td><div class="kurv-antal-ctrl">
              <button onclick="removeFromCart('${v.name.replace(/'/g,"\\'")}');showCartPage()">−</button>
              <input type="number" class="kurv-antal-input" data-navn="${v.name.replace(/"/g,'&quot;')}" data-pris="${v.price}" value="${v.qty}" min="0" max="50" onchange="updateCartItem(this)">
              <button onclick="addToCart('${v.name.replace(/'/g,"\\'")}',${v.price});showCartPage()">+</button>
            </div></td>
            <td class="kurv-rad-subtotal">${formatPrice(v.price * v.qty)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="kurv-hojre">
      <div class="kurv-samlet-boks">
        <h3 class="kurv-samlet-titel">Samlet beløb i kurv</h3>
        <table class="kurv-samlet-tabel">
          <tr><th>Subtotal</th><td id="ks-subtotal"></td></tr>
          <tr><th>Forsendelse</th><td>
            <div class="forsendelse-valg">
              <label><input type="radio" name="forsendelse" value="afhentning" checked onchange="calculateCartTotals()"> Afhentning <span style="color:var(--gray);font-size:0.8rem;">(Gratis)</span></label>
              <label><input type="radio" name="forsendelse" value="levering" onchange="calculateCartTotals()"> Levering <span id="levering-hint" style="color:var(--gray);font-size:0.8rem;">(40–50 kr.)</span></label>
            </div>
            <div id="ks-lev-pris" style="font-size:0.82rem;font-weight:700;margin-top:0.3rem;"></div>
            <p style="font-size:0.78rem;color:var(--gray);margin-top:0.5rem;line-height:1.4;"><strong>OBS:</strong> Fragtmuligheder vises først ved indtastning af din fulde adresse, by og postnummer. Vi leverer kun inden for 4 kilometer fra restauranten.</p>
          </td></tr>
          <tr class="kurv-total-rad"><th>Total</th><td>
            <div id="ks-total"></div>
            <div id="ks-moms" class="ks-moms-note"></div>
          </td></tr>
        </table>
        <button class="kurv-checkout-knap" onclick="showCheckout()">Gå til kassen</button>
      </div>
    </div>
  `;
  calculateCartTotals();
  showPage('kurv');
}

function checkout() {
  if (cart.length === 0) { showToast('Din kurv er tom!'); return; }
  cart = [];
  activeCoupon = null;
  updateCartUI();
  showPage('hjem');
  showToast('Ordre modtaget! Tak for din bestilling.');
}

let toastTimer;
let toastUndoFn = null;
function showToast(message) {
  const t = document.getElementById('toast');
  toastUndoFn = null;
  t.textContent = message;
  t.classList.add('vis');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('vis'), 2500);
}

function showUndoToast(message, undoFn) {
  const t = document.getElementById('toast');
  toastUndoFn = undoFn;
  t.innerHTML = `${message} <button type="button" onclick="runToastUndo()" style="margin-left:0.6rem;background:none;border:none;color:#E8C060;font-weight:700;text-decoration:underline;cursor:pointer;padding:0;font-size:inherit;font-family:inherit;">Fortryd</button>`;
  t.classList.add('vis');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('vis'); toastUndoFn = null; }, 4000);
}

function runToastUndo() {
  if (toastUndoFn) { toastUndoFn(); toastUndoFn = null; }
  const t = document.getElementById('toast');
  t.classList.remove('vis');
  clearTimeout(toastTimer);
}

// DANISH HOLIDAY DETECTION
function getEaster(y) {
  const a = y%19, b = Math.floor(y/100), c = y%100;
  const d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15)%30;
  const i = Math.floor(c/4), k = c%4, l = (32+2*e+2*i-h-k)%7;
  const m = Math.floor((a+11*h+22*l)/451);
  const mo = Math.floor((h+l-7*m+114)/31);
  const dy = (h+l-7*m+114)%31+1;
  return new Date(y, mo-1, dy);
}

function isDanishHoliday(date) {
  const y = date.getFullYear(), mo = date.getMonth()+1, dy = date.getDate();
  // Fixed holidays
  if ([[1,1],[6,5],[12,24],[12,25],[12,26],[12,31]].some(([m,d]) => mo===m && dy===d)) return true;
  // Easter-based moveable feasts: Skærtorsdag(-3), Langfredag(-2), Påske(0), 2.Påske(+1), Himmelfart(+39), Pinse(+49), 2.Pinse(+50)
  const easter = getEaster(y);
  return [-3,-2,0,1,39,49,50].some(off => {
    const h = new Date(easter.getTime() + off*864e5);
    return h.getFullYear()===y && h.getMonth()===date.getMonth() && h.getDate()===dy;
  });
}

function nextOpenInfo(from) {
  const dayNames = ['søn','man','tir','ons','tor','fre','lør'];
  const d = new Date(from);
  for (let i = 1; i <= 8; i++) {
    d.setDate(d.getDate() + 1);
    if (!isDanishHoliday(d)) {
      const dow = d.getDay();
      const t = (dow===5||dow===6) ? '15:30' : '16:00';
      return `${dayNames[dow]} kl. ${t}`;
    }
  }
  return 'snart';
}

function parseTime(s) {
  const [h, m] = (s || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function isOnlineOrderOpen() {
  if (FORCE_OPEN) return true;
  const now = new Date();
  if (isDanishHoliday(now)) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();
  const openTime      = parseTime((day >= 5) ? siteConfig.hours.weekendOpen : siteConfig.hours.weekdayOpen);
  const onlineCloseTime = parseTime(siteConfig.hours.onlineClose);
  return minutes >= openTime && minutes <= onlineCloseTime;
}

function updateStatus() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();
  const openTime      = parseTime((day >= 5) ? siteConfig.hours.weekendOpen : siteConfig.hours.weekdayOpen);
  const closeTime     = parseTime(siteConfig.hours.close);
  const onlineCloseTime = parseTime(siteConfig.hours.onlineClose);
  const holiday = isDanishHoliday(now);
  const isOpen = FORCE_OPEN || (!holiday && minutes >= openTime && minutes <= closeTime);
  const isOnlineOpen = FORCE_OPEN || (!holiday && minutes >= openTime && minutes <= onlineCloseTime);
  const bar = document.getElementById('status-bar');
  const opensAt = (day >= 5) ? siteConfig.hours.weekendOpen : siteConfig.hours.weekdayOpen;
  const phoneSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.66A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`;
  const screenSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`;

  if (holiday) {
    bar.innerHTML = `
      <span class="sb-pill"><span class="sb-dot" style="background:#f87171"></span>Lukket – Helligdag</span>
      <span class="sb-item">${phoneSvg} Åbner igen <span class="sb-time">${nextOpenInfo(now)}</span></span>`;
    bar.classList.add('lukket');
  } else if (!isOpen) {
    bar.innerHTML = `
      <span class="sb-pill"><span class="sb-dot" style="background:#f87171"></span>Lukket nu</span>
      <span class="sb-item">${phoneSvg} Åbner igen <span class="sb-time">kl. ${opensAt}</span></span>`;
    bar.classList.add('lukket');
  } else if (!isOnlineOpen) {
    bar.innerHTML = `
      <span class="sb-pill"><span class="sb-dot"></span>Åbent nu</span>
      <span class="sb-item">${screenSvg} Online bestilling <span class="sb-warn">lukket</span></span>
      <span class="sb-sep"></span>
      <span class="sb-item">${phoneSvg} Telefon <span class="sb-time">til ${siteConfig.hours.close}</span></span>`;
    bar.classList.remove('lukket');
  } else {
    bar.innerHTML = `
      <span class="sb-pill"><span class="sb-dot"></span>Åbent nu</span>
      <span class="sb-item">${screenSvg} Online bestilling <span class="sb-warn">lukker ${siteConfig.hours.onlineClose}</span></span>
      <span class="sb-sep"></span>
      <span class="sb-item">${phoneSvg} Telefon <span class="sb-time">til ${siteConfig.hours.close}</span></span>`;
    bar.classList.remove('lukket');
  }

  const banner = document.getElementById('kassen-lukket-banner');
  const orderBtn = document.getElementById('placer-ordre-knap');
  if (banner) banner.style.display = isOnlineOpen ? 'none' : 'block';
  if (orderBtn) {
    orderBtn.disabled = !isOnlineOpen;
    orderBtn.style.opacity = isOnlineOpen ? '1' : '0.4';
    orderBtn.style.cursor = isOnlineOpen ? 'pointer' : 'not-allowed';
  }
}

function updateHoursDisplay() {
  const h  = siteConfig.hours;
  const wd = `${h.weekdayOpen}–${h.close}`;
  const we = `${h.weekendOpen}–${h.close}`;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('footer-hrs-1', `Man–Tor: ${wd}`);
  set('footer-hrs-2', `Fre–Lør: ${we}`);
  set('footer-hrs-3', `Søn: ${wd}`);
  set('contact-hrs-wd',  wd);
  set('contact-hrs-we',  we);
  set('contact-hrs-sun', wd);
  set('map-hrs-wd', wd);
  set('map-hrs-we', we);
  set('kassen-lukket-wd-tid', h.weekdayOpen);
  set('kassen-lukket-we-tid', h.weekendOpen);
}

// Admin panel is now at admin.html
function adminLogin()   { window.location.href = 'admin.html'; }
function adminLogout()  { showPage('hjem'); }
function saveNotice() {
  const data = {
    slået_til: document.getElementById('notice-slået-til').checked,
    besked:    document.getElementById('notice-besked').value.trim(),
    fra:       document.getElementById('notice-fra').value,
    til:       document.getElementById('notice-til').value,
  };
  localStorage.setItem('lp_notice', JSON.stringify(data));
  applyNotice();
  updateActiveNoticeDisplay();
  showToast('✓ Besked gemt og publiceret!');
}

function loadAdminState() {
  const raw = localStorage.getItem('lp_notice');
  if (!raw) return;
  const data = JSON.parse(raw);
  document.getElementById('notice-slået-til').checked = data.slået_til || false;
  document.getElementById('notice-besked').value = data.besked || '';
  document.getElementById('notice-fra').value = data.fra || '';
  document.getElementById('notice-til').value = data.til || '';
  previewNotice();
  updateActiveNoticeDisplay();
}

function previewNotice() {
  const message = document.getElementById('notice-besked').value.trim();
  const el = document.getElementById('forhåndsvisning');
  if (message) {
    el.style.display = 'block';
    document.getElementById('forhåndsvisning-tekst').textContent = message;
  } else {
    el.style.display = 'none';
  }
}

// Scheduled closures — add/remove entries here as needed.
// Each entry shows on any date that falls within one of its ranges.
const scheduledClosures = [
  {
    besked: 'Restauranten holder lukket den 24., 25., 26. samt 31. december.',
    ranges: [
      { fra: '2025-12-24', til: '2025-12-26' },
      { fra: '2025-12-31', til: '2025-12-31' },
    ],
  },
];

function applyNotice() {
  const banner = document.getElementById('notice-banner');
  if (!banner) return;
  const today = new Date().toISOString().slice(0, 10);

  const show = (tekst) => {
    const dismissed = sessionStorage.getItem('lp_notice_afvist');
    if (dismissed === tekst) return; // kun afvist hvis SAMME besked
    document.getElementById('notice-tekst').textContent = tekst;
    banner.style.display = 'block';
  };
  const hide = () => { banner.style.display = 'none'; };

  // Planlagte lukninger
  for (const closure of scheduledClosures) {
    const active = closure.ranges.some(r => today >= r.fra && today <= r.til);
    if (active) { show(closure.besked); return; }
  }

  // Admin-besked fra config.json
  const data = siteConfig.notice;
  if (!data) return; // config.json kunne ikke hentes — rør ikke ved den statiske fallback-besked i HTML'en
  if (!data.aktiv || !data.besked) { hide(); return; }
  const now = new Date();
  const fra = data.fra ? new Date(data.fra + 'T00:00:00') : null;
  const til = data.til ? new Date(data.til + 'T23:59:59') : null;
  const inRange = (!fra || now >= fra) && (!til || now <= til);
  if (inRange) { show(data.besked); } else { hide(); }
}

function dismissNotice() {
  const banner = document.getElementById('notice-banner');
  if (banner) banner.style.display = 'none';
  sessionStorage.setItem('lp_notice_afvist', siteConfig.notice && siteConfig.notice.besked || '1');
}

function updateActiveNoticeDisplay() {
  const raw = localStorage.getItem('lp_notice');
  const el = document.getElementById('aktiv-notice-visning');
  if (!raw) {
    el.innerHTML = '<p class="muted-small">Ingen gemt besked endnu.</p>';
    return;
  }
  const d = JSON.parse(raw);
  const pill = d.slået_til
    ? '<span class="status-pille pille-til">Aktiv</span>'
    : '<span class="status-pille pille-fra">Slået fra</span>';
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
      <div>
        <p style="font-size:0.9rem; font-weight:600; margin-bottom:0.3rem;">${d.besked || '(ingen tekst)'}</p>
        <p class="muted-small">📅 ${d.fra || '—'} → ${d.til || '—'}</p>
      </div>
      ${pill}
    </div>
  `;
}

function slideCat(direction) {
  const slider = document.getElementById('kat-slider');
  slider.scrollBy({ left: direction * 180, behavior: 'smooth' });
}

// PRODUCT MODAL
const pizzaToppingGroups = [
  { titel: 'Alm. Topping', items: ['Ansjoser','Bacon','Béarnaise','Krabbekød','Kylling','Kebab','Kødsauce','Muslinger','Oksekød','Pepperoni','Pølser','Rejer','Skinke','Spaghetti','Sucuk','Tun'].map(n => ({ navn: n, pris: n === 'Béarnaise' ? 15 : 10 })) },
  { titel: 'Alm. Frugt & Grønt', items: [
    {navn:'Agurk',pris:10},{navn:'Avocado',pris:10},{navn:'Ananas',pris:10},{navn:'Asparges',pris:10},
    {navn:'Broccoli',pris:10},{navn:'Champignon',pris:10},{navn:'Capers',pris:10},{navn:'Frisk Tomat',pris:10},
    {navn:'Salat & Dressing',pris:20},{navn:'Jalapeños (HOT)',pris:10},{navn:'Majs',pris:10},
    {navn:'Oliven',pris:10},{navn:'Rød peber',pris:10},{navn:'Spinat',pris:10}
  ]},
  { titel: 'Ingredienser', items: [
    {navn:'Løg',pris:0},{navn:'Hvidløg',pris:0},{navn:'Chili',pris:0},
    {navn:'Tacokrydderi',pris:0},{navn:'Karry',pris:0},{navn:'Dressing',pris:10}
  ]},
  { titel: 'I Bæger', items: [{navn:'Hvidløg',pris:10},{navn:'Chili',pris:10},{navn:'Dressing',pris:15},{navn:'Hjemmelavet Chilli',pris:20,fastPris:true}] },
  { titel: 'Alm. Ekstra Ost', items: [
    {navn:'Ekstra Ost',pris:10},{navn:'Cheddar',pris:10},{navn:'Gorgonzola',pris:10},{navn:'Parmasan',pris:10},{navn:'Feta',pris:10}
  ]}
];

const grillExtraGroups = [
  { titel: 'Tilbehør', items: [
    { navn: 'Ketchup',         pris: 4  },
    { navn: 'Mayonnaise',      pris: 4  },
    { navn: 'Bæger, Chili',             pris: 10 },
    { navn: 'Bæger, Hvidløg',          pris: 10 },
    { navn: 'Bæger, Dressing',         pris: 15 },
    { navn: 'Bæger, Hjemmelavet Chilli', pris: 20, fastPris: true },
  ]},
  { titel: 'Pose', items: [
    { navn: 'Plastikpose', pris: 5, note: 'Lovpligtig bæreposeafgift ved grillmad og salater' },
  ]},
];

const pizzaToppingGroupsEN = [
  { titel: 'Regular Toppings', items: ['Anchovies','Bacon','Béarnaise','Crab meat','Chicken','Kebab','Meat sauce','Mussels','Beef','Pepperoni','Sausages','Shrimp','Ham','Spaghetti','Sucuk','Tuna'].map(n => ({ navn: n, pris: n === 'Béarnaise' ? 15 : 10 })) },
  { titel: 'Fruit & Vegetables', items: [
    {navn:'Cucumber',pris:10},{navn:'Avocado',pris:10},{navn:'Pineapple',pris:10},{navn:'Asparagus',pris:10},
    {navn:'Broccoli',pris:10},{navn:'Mushrooms',pris:10},{navn:'Capers',pris:10},{navn:'Fresh Tomato',pris:10},
    {navn:'Salad & Dressing',pris:20},{navn:'Jalapeños (HOT)',pris:10},{navn:'Corn',pris:10},
    {navn:'Olives',pris:10},{navn:'Red pepper',pris:10},{navn:'Spinach',pris:10}
  ]},
  { titel: 'Ingredients', items: [
    {navn:'Onion',pris:0},{navn:'Garlic',pris:0},{navn:'Chili',pris:0},
    {navn:'Taco seasoning',pris:0},{navn:'Curry',pris:0},{navn:'Dressing',pris:15}
  ]},
  { titel: 'In Cup', items: [{navn:'Garlic',pris:10},{navn:'Chili',pris:10},{navn:'Dressing',pris:15},{navn:'Homemade Chilli',pris:20,fastPris:true}] },
  { titel: 'Extra Cheese', items: [
    {navn:'Extra Cheese',pris:10},{navn:'Cheddar',pris:10},{navn:'Gorgonzola',pris:10},{navn:'Parmesan',pris:10},{navn:'Feta',pris:10}
  ]}
];
const grillExtraGroupsEN = [
  { titel: 'Sides', items: [
    { navn: 'Ketchup',       pris: 4  },
    { navn: 'Mayonnaise',    pris: 4  },
    { navn: 'Cup, Chili',           pris: 10 },
    { navn: 'Cup, Garlic',         pris: 10 },
    { navn: 'Cup, Dressing',       pris: 15 },
    { navn: 'Cup, Homemade Chilli', pris: 20, fastPris: true },
  ]},
  { titel: 'Bag', items: [
    { navn: 'Plastic bag', pris: 5, note: 'Compulsory carrier bag charge for grill food and salads' },
  ]},
];

// Børnepizza-topping — samme udvalg som almindelig pizza, men fast 10 kr. pr. betalt tilvalg
const BORNE_TOPPING_PRIS = 10;
const flatBornePris = groups => groups.map(g => ({ ...g, items: g.items.map(it => ({ ...it, pris: (it.pris > 0 && it.navn !== 'Hjemmelavet Chilli' && it.navn !== 'Homemade Chilli') ? BORNE_TOPPING_PRIS : it.pris })) }));
const borneToppingGroups   = flatBornePris(pizzaToppingGroups);
const borneToppingGroupsEN = flatBornePris(pizzaToppingGroupsEN);

let modalItem = null;
let modalQty = 1;

function openProductModal(name, price, description, img, showToppings, showGrillExtras, noToppings, showChilli = true, showBorneTopping = false) {
  const familiePrice = showToppings ? price * 2 - 5 : null;
  modalItem = { name, price, basePrice: price, familiePrice };
  modalQty = 1;
  const displayName = name.replace(/^\d+[A-Za-z]?\.\s*/, '');

  const isEN = getLang() === 'en';
  let extraGroups = (showToppings && !noToppings) ? (isEN ? pizzaToppingGroupsEN : pizzaToppingGroups)
    : (showBorneTopping && !noToppings) ? (isEN ? borneToppingGroupsEN : borneToppingGroups)
    : showGrillExtras ? (isEN ? grillExtraGroupsEN : grillExtraGroups) : [];
  // Pose-gebyret er automatisk for varenr. 54-69 — skjul den manuelle "Plastikpose"-mulighed for de varer
  if (kraeverPlastikpose(name)) {
    extraGroups = extraGroups
      .map(g => ({ ...g, items: g.items.filter(it => it.navn !== 'Plastikpose' && it.navn !== 'Plastic bag') }))
      .filter(g => g.items.length > 0);
  }
  const chilliGroup = (!noToppings && showChilli) ? [{ titel: isEN ? 'Add-ons' : 'Tilføj', items: [{ navn: isEN ? 'Homemade Chilli (cup)' : 'Hjemmelavet Chilli (bæger)', pris: 20, fastPris: true, kategori: isEN ? 'Add-ons' : 'Tilføj' }] }] : [];
  const allGroups = extraGroups.length ? extraGroups : chilliGroup;
  const toppingSectionLabel = allGroups.length
    ? `<div class="pm-extras-label">${(showToppings || showBorneTopping) ? t('Tilpas din pizza','Customise your pizza') : t('Tilbehør / Tilføj','Sides / Add-ons')} <span class="pm-extras-hint">— ${t('valgfrit','optional')}</span></div>`
    : '';
  const toppingHTML = toppingSectionLabel + allGroups.map((g, idx) => `
    <details class="pm-gruppe" id="pm-gruppe-${idx}" ${allGroups.length === 1 ? 'open' : ''}>
      <summary>
        <span class="pm-gruppe-titel-row">
          <span class="pm-gruppe-titel">${g.titel}</span>
          <button type="button" class="pm-ryd-valg" style="display:none" onclick="rydGruppeValg(event, ${idx})">${t('Ryd valg','Clear')}</button>
        </span>
      </summary>
      <div class="pm-gruppe-items">
        ${g.items.map(item => `
          <label class="pm-chip">
            <input type="checkbox" data-navn="${item.navn.replace(/"/g,'&quot;')}" data-pris="${item.pris}" data-fastpris="${item.fastPris ? '1' : ''}" data-kategori="${(item.kategori || g.titel).replace(/"/g,'&quot;')}" onchange="calcModalTotal()">
            ${item.navn}${item.pris > 0 ? `<span class="pm-chip-pris"> +${formatPrice(item.pris)}</span>` : ''}
            ${item.note ? `<span class="pm-chip-note">${item.note}</span>` : ''}
          </label>`).join('')}
      </div>
    </details>`).join('');

  const stoerrelseHTML = showToppings ? `
    <div class="pm-storrelse">
      <label class="pm-storrelse-label">${t('Størrelse','Size')}</label>
      <select class="pm-storrelse-select" onchange="skiftStorrelse(this.value)">
        <option value="alm">${t('Alm.','Regular')} — ${formatPrice(price)}</option>
        <option value="familie">${t('Familie','Family')} — ${formatPrice(familiePrice)}</option>
      </select>
    </div>` : '';

  document.getElementById('pm-img-wrapper').innerHTML =
    `<img src="${img}" alt="${displayName}" onerror="this.src='images/pizza-category.jpg'" style="width:100%;height:100%;object-fit:contain;display:block;background:#f9f6ff;">`;

  const prisVisningText = showToppings
    ? `${t('Alm.','Regular')} ${formatPrice(price)} · ${t('Familie','Family')} ${formatPrice(familiePrice)}`
    : formatPrice(price);

  const poseNoteHTML = kraeverPlastikpose(name)
    ? `<div class="pm-pose-note"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span>${t(`+ ${PLASTIKPOSE_PRIS} kr. lovpligtig pose tilføjes automatisk`, `+ ${PLASTIKPOSE_PRIS} kr. mandatory bag fee added automatically`)}</span></div>`
    : '';

  document.getElementById('pm-detaljer').innerHTML = `
    <h2 class="pm-navn">${displayName}</h2>
    <div class="pm-pris-visning" id="pm-pris-visning">${prisVisningText}</div>
    ${poseNoteHTML}
    ${description ? `<p class="pm-beskrivelse">${description}</p>` : ''}
    <a class="pm-allergen-link" href="tel:+4598154640">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      ${t('Spørgsmål om allergener? Ring 98 15 46 40','Allergy questions? Call 98 15 46 40')}
    </a>
    ${stoerrelseHTML}
    ${toppingHTML}`;

  document.getElementById('pm-sticky-bar').innerHTML = `
    <div class="pm-sticky-info">
      <span class="pm-tilvalg-antal" id="pm-tilvalg-antal" style="display:none"></span>
      <span class="pm-sticky-total">${t('Total:','Total:')} <strong id="pm-total">${formatPrice(price)}</strong></span>
    </div>
    <div class="pm-sticky-controls">
      <div class="kurv-antal-ctrl" style="height:40px;">
        <button style="width:34px;height:40px;" onclick="if(modalQty>1){modalQty--;document.getElementById('pm-antal').textContent=modalQty;calcModalTotal()}">−</button>
        <span id="pm-antal" style="min-width:32px;line-height:40px;">1</span>
        <button style="width:34px;height:40px;" onclick="modalQty++;document.getElementById('pm-antal').textContent=modalQty;calcModalTotal()">+</button>
      </div>
      <button class="pm-tilføj" onclick="addFromModal()">${t('Tilføj til kurv','Add to cart')}</button>
    </div>`;

  calcModalTotal();

  document.getElementById('pm-overlay').classList.add('åben');
  document.getElementById('pm-modal').classList.add('åben');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('pm-overlay').classList.remove('åben');
  document.getElementById('pm-modal').classList.remove('åben');
  document.body.style.overflow = '';
  modalItem = null;
}

function skiftStorrelse(val) {
  if (!modalItem) return;
  modalItem.price = val === 'familie' ? modalItem.familiePrice : modalItem.basePrice;
  calcModalTotal();
}

function calcModalTotal() {
  if (!modalItem) return;
  const sizeEl = document.querySelector('.pm-storrelse-select');
  const toppingMult = (sizeEl && sizeEl.value === 'familie') ? 2 : 1;
  document.querySelectorAll('#pm-detaljer .pm-chip').forEach(chip => {
    const cb = chip.querySelector('input[data-pris]');
    const span = chip.querySelector('.pm-chip-pris');
    if (cb && span) {
      const base = parseFloat(cb.dataset.pris);
      const mult = cb.dataset.fastpris ? 1 : toppingMult;
      if (base > 0) span.textContent = ` +${formatPrice(base * mult)}`;
    }
  });
  const checked = document.querySelectorAll('#pm-detaljer .pm-chip input:checked');
  const extraPrice = Array.from(checked).reduce((sum, cb) => sum + parseFloat(cb.dataset.pris) * (cb.dataset.fastpris ? 1 : toppingMult), 0);
  const poseExtra = kraeverPlastikpose(modalItem.name) ? PLASTIKPOSE_PRIS : 0;
  const basePrice = modalItem.price;
  const tot = document.getElementById('pm-total');
  if (tot) tot.textContent = formatPrice((basePrice + extraPrice + poseExtra) * modalQty);
  const antalEl = document.getElementById('pm-tilvalg-antal');
  if (antalEl) {
    const n = checked.length;
    antalEl.textContent = n === 0 ? '' : t(`${n} tilvalg`, `${n} extra${n === 1 ? '' : 's'}`);
    antalEl.style.display = n > 0 ? '' : 'none';
  }
  document.querySelectorAll('#pm-detaljer .pm-gruppe').forEach(groupEl => {
    const btn = groupEl.querySelector('.pm-ryd-valg');
    if (btn) btn.style.display = groupEl.querySelector('input:checked') ? '' : 'none';
  });
}

function rydGruppeValg(event, idx) {
  event.preventDefault();
  event.stopPropagation();
  const groupEl = document.getElementById(`pm-gruppe-${idx}`);
  if (!groupEl) return;
  groupEl.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
  calcModalTotal();
}

function addFromModal() {
  if (!modalItem) return;
  const autoPose = kraeverPlastikpose(modalItem.name);
  // Undgå dobbelt pose-gebyr hvis kunden også har afkrydset den manuelle "Plastikpose"-mulighed
  const checked = Array.from(document.querySelectorAll('#pm-detaljer .pm-chip input:checked'))
    .filter(cb => !(autoPose && cb.dataset.navn === 'Plastikpose'));
  const toppingNames = checked.map(cb => cb.dataset.navn);
  const sizeEl = document.querySelector('.pm-storrelse-select');
  const isFamilie = sizeEl && sizeEl.value === 'familie';
  const toppingMult = isFamilie ? 2 : 1;
  const extraPrice = checked.reduce((sum, cb) => sum + parseFloat(cb.dataset.pris) * (cb.dataset.fastpris ? 1 : toppingMult), 0);
  const poseExtra = autoPose ? PLASTIKPOSE_PRIS : 0;
  const totalPrice = modalItem.price + extraPrice + poseExtra;
  const displayExtras = autoPose ? [...toppingNames, `pose ${PLASTIKPOSE_PRIS} kr.`] : toppingNames;
  const cartName = displayExtras.length > 0
    ? `${modalItem.name} (${displayExtras.join(', ')})`
    : modalItem.name;
  const size = sizeEl ? (isFamilie ? 'Familie' : 'Almindelig') : null;
  const extras = checked.map(cb => ({ navn: cb.dataset.navn, pris: parseFloat(cb.dataset.pris) * (cb.dataset.fastpris ? 1 : toppingMult), kategori: cb.dataset.kategori || 'Tilbehør' }));
  if (autoPose) extras.push({ navn: 'Plastikpose', pris: PLASTIKPOSE_PRIS, kategori: 'Pose' });
  const existing = cart.find(v => v.name === cartName && v.price === totalPrice);
  if (existing) {
    existing.qty += modalQty;
  } else {
    cart.push({ name: cartName, price: totalPrice, qty: modalQty, baseName: modalItem.name, size, extras });
  }
  updateCartUI();
  const displayName = modalItem.name.replace(/^\d+[A-Za-z]?\.\s*/, '');
  showToast(`${displayName} tilføjet til kurv`);
  const badge = document.getElementById('kurv-badge');
  badge.classList.remove('puls');
  void badge.offsetWidth;
  badge.classList.add('puls');
  setTimeout(() => badge.classList.remove('puls'), 200);
  closeProductModal();
}

function openMobileNav() { document.getElementById('mobil-nav').classList.add('åben'); }
function closeMobileNav() { document.getElementById('mobil-nav').classList.remove('åben'); }

// Escape key closes whichever overlay is currently open (topmost first)
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  const pmModal = document.getElementById('pm-modal');
  const kurvSkuffe = document.getElementById('kurv-skuffe');
  const mobilNav = document.getElementById('mobil-nav');
  const cookieOverlay = document.getElementById('cookie-overlay');
  if (pmModal && pmModal.classList.contains('åben')) { closeProductModal(); return; }
  if (kurvSkuffe && kurvSkuffe.classList.contains('åben')) { closeCart(); return; }
  if (mobilNav && mobilNav.classList.contains('åben')) { closeMobileNav(); return; }
  if (cookieOverlay && cookieOverlay.style.display === 'flex' && typeof closeCookies === 'function') { closeCookies(); }
});

// CHECKOUT

// CONFIG
// Restaurant: Lemvigvej 97, 9220 Aalborg
const RESTAURANT_LAT = 57.0436;
const RESTAURANT_LNG = 9.9834;
const MAX_LEVERING_KM = 4;

// QUICKPAY BETALING
// Sæt til true når quickpay-create.php er konfigureret med API-nøgle.
const QUICKPAY_ENABLED = true;

// SHOW CHECKOUT
function genererTidspunkter() {
  const sel = document.getElementById('ks-tidspunkt');
  if (!sel) return;
  sel.innerHTML = '<option value="Snarest muligt">Snarest muligt</option>';
  const nu = new Date();
  const dag = nu.getDay(); // 0=sun,6=sat
  const erWeekend = dag === 0 || dag === 5 || dag === 6;
  const [åbnH, åbnM] = (erWeekend ? siteConfig.hours.weekendOpen : siteConfig.hours.weekdayOpen).split(':').map(Number);
  const [lukH, lukM] = siteConfig.hours.onlineClose.split(':').map(Number);
  const åbn = new Date(nu); åbn.setHours(åbnH, åbnM, 0, 0);
  const luk = new Date(nu); luk.setHours(lukH, lukM, 0, 0);
  // Start from next 15-min slot at least 20 min from now
  const start = new Date(Math.max(åbn.getTime(), nu.getTime() + 20 * 60000));
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  for (let t = new Date(start); t <= luk; t.setMinutes(t.getMinutes() + 15)) {
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const opt = document.createElement('option');
    opt.value = opt.textContent = `${hh}:${mm}`;
    sel.appendChild(opt);
  }
}

function showCheckout() {
  if (cart.length === 0) { showToast('Din kurv er tom!'); return; }
  const afhentningRadio = document.querySelector('input[name="kassen-forsendelse"][value="afhentning"]');
  if (afhentningRadio) afhentningRadio.checked = true;
  document.getElementById('levering-adresse-form').style.display = 'none';
  document.getElementById('zone-resultat').style.display = 'none';
  zoneGodkendt = false;
  genererTidspunkter();
  renderKassenOversigt();
  initPaymentForm();
  attachZoneAutoTrigger();
  showPage('kassen');
}

// ORDER SUMMARY (right column)
function renderKassenOversigt() {
  const subtotal = cart.reduce((s, v) => s + v.price * v.qty, 0);
  const cartQty  = cart.reduce((s, v) => s + v.qty, 0);
  const delivery = getKassenLeveringPris();
  const total = subtotal + delivery;
  const vat = Math.round(total / 1.25 * 0.25);

  const levHint = document.getElementById('levering-hint');
  if (levHint) levHint.textContent = subtotal > 600 ? 'Gratis' : cartQty <= 1 ? '50 kr.' : '40 kr.';

  const findImg = name => {
    const baseName = name.replace(/\s*\(.*$/, ''); // strip "(extras)"
    for (const cat of Object.values(menuData)) {
      const item = cat.find?.(i => i.navn === name || i.navn === baseName || name.startsWith(i.navn));
      if (item?.img) return item.img;
    }
    return null;
  };
  document.getElementById('kassen-ordre-liste').innerHTML = cart.map(v => {
    const cleanName = v.name.replace(/^\d+[A-Za-z]?\.\s*/, '');
    const img = findImg(v.name);
    const safeName = v.name.replace(/'/g, "\\'");
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      ${img ? `<img src="${img}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:52px;height:52px;border-radius:8px;flex-shrink:0;background:#f5f5f5;"></div>`}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:0.88rem;line-height:1.3;">${cleanName}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:5px;">
          <button onclick="removeFromCart('${safeName}');renderKassenOversigt()" style="width:24px;height:24px;border:1px solid var(--border);border-radius:4px;background:white;cursor:pointer;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center;">−</button>
          <span style="font-size:0.88rem;font-weight:600;min-width:16px;text-align:center;">${v.qty}</span>
          <button onclick="addToCart('${safeName}',${v.price});renderKassenOversigt()" style="width:24px;height:24px;border:1px solid var(--border);border-radius:4px;background:white;cursor:pointer;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center;">+</button>
        </div>
      </div>
      <div style="font-weight:700;font-size:0.9rem;white-space:nowrap;">${formatPrice(v.price * v.qty)}</div>
    </div>`;
  }).join('');

  document.getElementById('kassen-subtotal-vis').textContent = formatPrice(subtotal);
  document.getElementById('kassen-levering-vis').textContent = delivery ? formatPrice(delivery) : 'Gratis';
  document.getElementById('kassen-total-vis').textContent = formatPrice(total);
  document.getElementById('kassen-moms-vis').textContent = `inkluderer ${formatPrice(vat)} moms`;

  const rabatLinje = document.getElementById('kassen-rabat-linje');
  if (rabatLinje) rabatLinje.style.display = 'none';
}

function getKassenLeveringPris() {
  if (document.querySelector('input[name="kassen-forsendelse"]:checked')?.value !== 'levering') return 0;
  const subtotal = cart.reduce((sum, v) => sum + v.price * v.qty, 0);
  const cartQty  = cart.reduce((sum, v) => sum + v.qty, 0);
  if (subtotal > 600) return 0;
  return cartQty <= 1 ? 50 : 40;
}

function toggleLeveringForm() {
  const erLevering = document.querySelector('input[name="kassen-forsendelse"]:checked')?.value === 'levering';
  document.getElementById('levering-adresse-form').style.display = erLevering ? '' : 'none';
  document.getElementById('zone-resultat').style.display = 'none';
  if (!erLevering) zoneGodkendt = true; // no zone check needed for pickup
  renderKassenOversigt();
}

// Auto-trigger zone check when all three address fields are filled
let zoneAutoTimer = null;
function attachZoneAutoTrigger() {
  ['ks-adresse', 'ks-postnr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      clearTimeout(zoneAutoTimer);
      const adresse = document.getElementById('ks-adresse').value.trim();
      const postnr = document.getElementById('ks-postnr').value.trim();
      if (adresse && postnr.length === 4) {
        zoneAutoTimer = setTimeout(tjekLeveringszone, 800);
      }
    });
  });
}

// GEOCODING + DISTANCE
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let zoneGodkendt = false;

async function tjekLeveringszone() {
  const adresse = document.getElementById('ks-adresse').value.trim();
  const postnr = document.getElementById('ks-postnr').value.trim();
  const el = document.getElementById('zone-resultat');
  const knap = document.getElementById('tjek-zone-knap');

  if (!adresse || !postnr) {
    el.className = 'zone-resultat zone-fejl';
    el.style.display = 'block';
    el.textContent = 'Udfyld venligst adresse og postnummer.';
    return;
  }

  // Strip apartment info (everything after comma) — Nominatim only needs street + house nr
  const gade = adresse.split(',')[0].trim();

  el.className = 'zone-resultat zone-loader';
  el.style.display = 'block';
  el.textContent = 'Beregner afstand…';
  knap.disabled = true;
  zoneGodkendt = false;

  try {
    // Try structured first, fall back to free-text if no results
    const structured = new URLSearchParams({ street: gade, postalcode: postnr, country: 'dk', format: 'json', limit: '1' });
    const resp1 = await fetch(`https://nominatim.openstreetmap.org/search?${structured}`, { headers: { 'Accept-Language': 'da' } });
    if (!resp1.ok) throw new Error('Netværksfejl. Prøv igen.');
    let data = await resp1.json();

    if (!data.length) {
      const free = new URLSearchParams({ q: `${gade}, ${postnr}, Denmark`, format: 'json', limit: '1' });
      const resp2 = await fetch(`https://nominatim.openstreetmap.org/search?${free}`, { headers: { 'Accept-Language': 'da' } });
      data = await resp2.json();
    }

    if (!data.length) throw new Error('Adressen blev ikke fundet. Tjek gadenavn og postnummer.');

    const km = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, parseFloat(data[0].lat), parseFloat(data[0].lon));

    if (km <= MAX_LEVERING_KM) {
      el.className = 'zone-resultat zone-ok';
      el.style.display = 'block';
      el.textContent = `✓ Levering mulig — ca. ${km.toFixed(1)} km fra restauranten.`;
      zoneGodkendt = true;
    } else {
      el.className = 'zone-resultat zone-fejl';
      el.style.display = 'block';
      el.textContent = `✗ Levering ikke mulig — ${km.toFixed(1)} km fra restauranten (maks. ${MAX_LEVERING_KM} km). Ring på 98 15 46 40.`;
      zoneGodkendt = false;
    }
  } catch (err) {
    el.className = 'zone-resultat zone-fejl';
    el.style.display = 'block';
    el.textContent = err.message || 'Kunne ikke beregne afstand. Prøv igen.';
    zoneGodkendt = false;
  } finally {
    knap.disabled = false;
  }
}

// PAYMENT FORM
let netsCheckout = null;
let valgtBetalingsMetode = 'dankort'; // 'dankort' | 'kort'

function initPaymentForm() {
  const el = document.getElementById('betaling-indhold');
  valgtBetalingsMetode = 'dankort';

  if (QUICKPAY_ENABLED) {
    // LIVE MODE
    el.innerHTML = `
      <div class="betalings-metoder">
        <button type="button" class="betalings-metode-knap aktiv-metode" onclick="vælgBetalingsMetode('dankort',this)">
          <div class="bm-logo"><img src="images/dankort.png" alt="Dankort" style="height:28px; width:auto;"></div>
          <span>Dankort</span>
        </button>
        <button type="button" class="betalings-metode-knap" onclick="vælgBetalingsMetode('kort',this)">
          <div class="bm-logo"><img src="images/visa.png" alt="Visa / Mastercard" style="height:28px; width:auto;"></div>
          <span>Visa / MC</span>
        </button>
      </div>
      <div id="live-betaling-info" style="font-size:0.82rem;color:var(--gray);margin-top:0.75rem;line-height:1.5;">
        Betaling behandles sikkert via Quickpay. MobilePay er tilgængeligt ved afhentning i butikken.
      </div>
      <div id="payment-besked"></div>`;
  } else {
    // DEMO MODE
    el.innerHTML = `
      <div class="betalings-metoder">
        <button type="button" class="betalings-metode-knap aktiv-metode" onclick="vælgBetalingsMetode('dankort',this)">
          <div class="bm-logo"><img src="images/dankort.png" alt="Dankort" style="height:28px; width:auto;"></div>
          <span>Dankort</span>
        </button>
        <button type="button" class="betalings-metode-knap" onclick="vælgBetalingsMetode('kort',this)">
          <div class="bm-logo"><img src="images/visa.png" alt="Visa / Mastercard" style="height:28px; width:auto;"></div>
          <span>Visa / MC</span>
        </button>
      </div>
      <div id="demo-betalings-formular"></div>
      <div id="payment-besked"></div>
      <p style="font-size:0.72rem;color:var(--gray);margin-top:0.9rem;line-height:1.5;">
        Demo-tilstand — sæt <code>QUICKPAY_ENABLED = true</code> i scriptet når API-nøglen er klar.
      </p>`;
    visDemoBetalingsFormular('dankort');
  }
}

function vælgBetalingsMetode(metode, knap) {
  valgtBetalingsMetode = metode;
  document.querySelectorAll('.betalings-metode-knap').forEach(b => b.classList.remove('aktiv-metode'));
  knap.classList.add('aktiv-metode');
  if (!QUICKPAY_ENABLED) visDemoBetalingsFormular(metode);
  document.getElementById('payment-besked').innerHTML = '';

}

function visDemoBetalingsFormular(metode) {
  const el = document.getElementById('demo-betalings-formular');
  {
    // Dankort or Visa/MC — same card form
    const label = metode === 'dankort' ? 'Dankort-nummer' : 'Kortnummer';
    const mitidNote = metode === 'dankort'
      ? `<p style="font-size:0.77rem;color:#555;margin-top:0.6rem;padding:0.6rem 0.85rem;background:#f0faf4;border-radius:7px;border:1px solid #9ae6b4;line-height:1.5;">
           🔐 <strong>MitID-godkendelse:</strong> I det rigtige miljø vil Nets automatisk bede dig bekræfte betaling med MitID under 3DS-flow.
         </p>` : '';
    el.innerHTML = `
      <div class="kort-grid">
        <div class="kassen-felt felt--fuld">
          <label>${label}</label>
          <div class="kortikon-wrapper">
            <input type="text" id="demo-kortnr" placeholder="0000 0000 0000 0000"
              maxlength="19" inputmode="numeric" autocomplete="cc-number"
              oninput="formatKortnr(this)" onblur="validerKortnr(this)">
            <span class="kortikon" id="kort-ikon">${metode === 'dankort' ? '🇩🇰' : '💳'}</span>
          </div>
        </div>
        <div class="kort-felt-row">
          <div class="kassen-felt">
            <label>Udløbsdato</label>
            <input type="text" id="demo-udlob" placeholder="MM/ÅÅ" maxlength="5"
              inputmode="numeric" autocomplete="cc-exp"
              oninput="formatUdlob(this)" onblur="validerUdlob(this)">
          </div>
          <div class="kassen-felt">
            <label>CVV</label>
            <input type="text" id="demo-cvv" placeholder="•••" maxlength="4"
              inputmode="numeric" autocomplete="cc-csc"
              oninput="this.value=this.value.replace(/\\D/g,'')" onblur="validerCvv(this)">
          </div>
        </div>
        <div class="kassen-felt felt--fuld">
          <label>Navn på kort</label>
          <input type="text" id="demo-kortnavn" placeholder="Fulde navn som på kortet" autocomplete="cc-name">
        </div>
      </div>
      ${mitidNote}`;
  }
}

let _pendingOrderData = null;

// QUICKPAY RETURN HANDLER
(function handleQuickpayReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('betaling');
  if (!status) return;

  history.replaceState({}, '', window.location.pathname);

  if (status === 'annulleret') {
    setTimeout(() => { showToast('Betaling annulleret.'); showPage('kassen'); }, 300);
    return;
  }

  if (status === 'gennemfort') {
    const saved = localStorage.getItem('lp_pending_order');
    if (!saved) return;
    const order = JSON.parse(saved);
    localStorage.removeItem('lp_pending_order');

    cart = order.cart || [];
    _pendingOrderData = order;
    setTimeout(() => finaliserOrdre(order.ordreNr), 400);
  }
})();

// CARD HELPERS (DEMO)
function formatKortnr(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
  const icon = document.getElementById('kort-ikon');
  if (icon) {
    if (v.startsWith('4')) icon.textContent = '💙';
    else if (/^5[1-5]/.test(v) || /^2[2-7]/.test(v)) icon.textContent = '🔴';
    else icon.textContent = '💳';
  }
}

function luhnCheck(num) {
  const digits = num.replace(/\D/g, '');
  let sum = 0, odd = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]);
    if (odd) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    odd = !odd;
  }
  return digits.length >= 13 && sum % 10 === 0;
}

function validerKortnr(input) {
  const raw = input.value.replace(/\D/g, '');
  if (raw.length >= 13 && luhnCheck(raw)) {
    input.classList.add('gyldig'); input.classList.remove('ugyldig');
  } else if (raw.length > 0) {
    input.classList.add('ugyldig'); input.classList.remove('gyldig');
  }
}

function formatUdlob(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  input.value = v;
}

function validerUdlob(input) {
  const parts = input.value.split('/');
  const now = new Date();
  const curYear = now.getFullYear() % 100;
  const curMonth = now.getMonth() + 1;
  const ok = parts.length === 2 && parts[0].length === 2 && parts[1].length === 2 &&
    parseInt(parts[0]) >= 1 && parseInt(parts[0]) <= 12 &&
    (parseInt(parts[1]) > curYear ||
      (parseInt(parts[1]) === curYear && parseInt(parts[0]) >= curMonth));
  if (ok) { input.classList.add('gyldig'); input.classList.remove('ugyldig'); }
  else if (input.value.length > 0) { input.classList.add('ugyldig'); input.classList.remove('gyldig'); }
}

function validerCvv(input) {
  if (/^\d{3,4}$/.test(input.value)) {
    input.classList.add('gyldig'); input.classList.remove('ugyldig');
  } else if (input.value.length > 0) {
    input.classList.add('ugyldig'); input.classList.remove('gyldig');
  }
}

// FORM VALIDATION
function validerKassenFelt(id, check) {
  const el = document.getElementById(id);
  if (!el) return true;
  const ok = check(el.value.trim());
  el.classList.toggle('ugyldig', !ok);
  el.classList.toggle('gyldig', ok);
  return ok;
}

// PLACE ORDER
async function placerOrdre() {
  if (!isOnlineOrderOpen()) {
    showToast('Online bestilling er desværre lukket nu.');
    return;
  }
  // 1. Validate contact
  const navnOk    = validerKassenFelt('ks-navn',    v => v.length >= 2);
  const emailOk   = validerKassenFelt('ks-email',   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  const telefonOk = validerKassenFelt('ks-telefon', v => /^[\d\s+\-()]{8,}$/.test(v));
  if (!navnOk || !emailOk || !telefonOk) {
    showToast('Udfyld venligst alle påkrævede felter.');
    document.getElementById('ks-navn').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // 2. Validate delivery address
  const erLevering = document.querySelector('input[name="kassen-forsendelse"]:checked')?.value === 'levering';
  if (erLevering) {
    const adresseOk = validerKassenFelt('ks-adresse', v => v.length >= 3);
    const postnrOk  = validerKassenFelt('ks-postnr',  v => /^\d{4}$/.test(v));
    if (!adresseOk || !postnrOk) {
      showToast('Udfyld venligst din leveringsadresse.');
      return;
    }
    if (!zoneGodkendt) {
      showToast('Tjek venligst om vi leverer til din adresse.');
      document.getElementById('tjek-zone-knap').scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }

  const knap = document.getElementById('placer-ordre-knap');
  knap.disabled = true;
  knap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Behandler…';

  // Temp ID for QuickPay — real sequential number assigned in finaliserOrdre after successful payment
  const ordreNr = 'LP' + Date.now().toString(36).toUpperCase().slice(-6);

  // 3. Process payment
  if (QUICKPAY_ENABLED) {
    // LIVE: redirect to Quickpay hosted payment page
    const subtotal = cart.reduce((s, v) => s + v.price * v.qty, 0);
    const delivery = getKassenLeveringPris();
    const discount = 0;
    const total    = subtotal + delivery;

    // Save order data so we can show confirmation after redirect
    localStorage.setItem('lp_pending_order', JSON.stringify({
      ordreNr,
      navn:        document.getElementById('ks-navn').value.trim(),
      email:       document.getElementById('ks-email').value.trim(),
      telefon:     document.getElementById('ks-telefon')?.value.trim() || '',
      kommentar:   document.getElementById('ks-kommentar')?.value.trim() || '',
      tidspunkt:   document.getElementById('ks-tidspunkt')?.value || 'Snarest muligt',
      leveringType: document.querySelector('input[name="kassen-forsendelse"]:checked')?.value || 'afhentning',
      adresse:     [document.getElementById('ks-adresse')?.value.trim(), document.getElementById('ks-etage')?.value.trim(), document.getElementById('ks-postnr')?.value.trim()].filter(Boolean).join(', '),
      cart:        [...cart],
      subtotal, delivery, discount, total,
    }));

    try {
      const resp = await fetch('lp-order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordre_nr: ordreNr, amount: total * 100, email: document.getElementById('ks-email').value.trim() }),
      });
      const text = await resp.text();
      if (!text) throw new Error(`Tomt svar fra server (HTTP ${resp.status}) — tjek server-loggen`);
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Ugyldigt svar (HTTP ${resp.status}): ${text.slice(0,120)}`); }
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (e) {
      const msg = document.getElementById('payment-besked');
      if (msg) msg.innerHTML = `<span class="payment-fejl">Betalingsfejl: ${e.message}</span>`;
      knap.disabled = false;
      knap.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Placer ordre';
    }
    return;
  } else {
    // DEMO: validate payment fields
    {
      const kortnr   = document.getElementById('demo-kortnr')?.value.replace(/\D/g, '');
      const udlob    = document.getElementById('demo-udlob')?.value;
      const cvv      = document.getElementById('demo-cvv')?.value;
      const kortnavn = document.getElementById('demo-kortnavn')?.value.trim();
      if (!luhnCheck(kortnr || '') || !udlob || !/^\d{3,4}$/.test(cvv || '') || !kortnavn) {
        document.getElementById('payment-besked').innerHTML =
          '<span class="payment-fejl">Udfyld venligst kortoplysningerne korrekt.</span>';
        if (document.getElementById('demo-kortnr'))  validerKortnr(document.getElementById('demo-kortnr'));
        if (document.getElementById('demo-udlob'))   validerUdlob(document.getElementById('demo-udlob'));
        if (document.getElementById('demo-cvv'))     validerCvv(document.getElementById('demo-cvv'));
        knap.disabled = false;
        knap.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Placer ordre';
        return;
      }
    }
    await new Promise(r => setTimeout(r, 1200)); // simulate processing
  }

  finaliserOrdre(ordreNr);
}

// FINALIZE ORDER
async function finaliserOrdre(_tempId) {
  let ordreNr;
  try {
    const _cr = await fetch('order-counter.php', { method: 'POST' });
    const _cd = await _cr.json();
    ordreNr = String(_cd.ordreNr);
  } catch (e) {
    ordreNr = String(Date.now()).slice(-5);
  }
  // Use saved data when returning from Quickpay (DOM fields are empty after redirect)
  const d = _pendingOrderData;
  _pendingOrderData = null;

  const navn        = d?.navn     ?? document.getElementById('ks-navn').value.trim();
  const email       = d?.email    ?? document.getElementById('ks-email').value.trim();
  const subtotal    = d?.subtotal ?? cart.reduce((s, v) => s + v.price * v.qty, 0);
  const delivery    = d?.delivery ?? getKassenLeveringPris();
  const discount    = 0;
  const total       = d?.total    ?? (subtotal + delivery);
  const leveringType = d?.leveringType ?? document.querySelector('input[name="kassen-forsendelse"]:checked')?.value ?? 'afhentning';
  const adresse     = d?.adresse  ?? [
    document.getElementById('ks-adresse')?.value.trim(),
    document.getElementById('ks-etage')?.value.trim(),
    document.getElementById('ks-postnr')?.value.trim(),
  ].filter(Boolean).join(', ');

  const telefon   = d?.telefon   ?? document.getElementById('ks-telefon')?.value.trim();
  const kommentar = d?.kommentar ?? document.getElementById('ks-kommentar')?.value.trim();
  const tidspunkt = d?.tidspunkt ?? document.getElementById('ks-tidspunkt')?.value ?? 'Snarest muligt';
  const betalingLabel = 'Kort / Quickpay';

  fetch('send-order.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ordreNr, navn, telefon, email, leveringType, adresse, kommentar,
      tidspunkt, betaling: betalingLabel, items: [...cart], subtotal, delivery, discount, total }),
  }).catch(() => {});

  sendOrderConfirmationEmail({ navn, email, ordreNr, items: [...cart], subtotal, delivery, discount, total, leveringType, adresse });
  sendRestaurantReceiptEmail({ navn, telefon, ordreNr, items: [...cart], subtotal, delivery, discount, total, leveringType, adresse, kommentar });

  document.getElementById('bekr-besked').innerHTML =
    `Hej <strong>${navn}</strong> — din ordre er modtaget.<br><span style="font-size:0.85rem;">En bekræftelse sendes til ${email}.</span>`;

  const ordrenrEl = document.getElementById('bekr-ordrenr');
  if (ordrenrEl) {
    ordrenrEl.dataset.ordrenr = ordreNr;
    ordrenrEl.style.display = 'inline-flex';
    ordrenrEl.innerHTML = `Ordre #${ordreNr}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  }

  const leveringTekst = leveringType === 'levering' ? 'Levering' : 'Afhentning';
  const ventetid = leveringType === 'levering' ? '30–60 min' : '20–30 min';
  const infoKort = document.getElementById('bekr-info-kort');
  if (infoKort) infoKort.innerHTML = [
    `<div style="background:#f5f5f5;border-radius:10px;padding:10px 16px;text-align:center;min-width:110px;">
      <div style="font-size:0.72rem;color:#666;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em;">Forsendelse</div>
      <div style="font-weight:700;font-size:0.9rem;">${leveringTekst}</div>
    </div>`,
    tidspunkt && tidspunkt !== 'Snarest muligt' ? `<div style="background:#f5f5f5;border-radius:10px;padding:10px 16px;text-align:center;min-width:110px;">
      <div style="font-size:0.72rem;color:#666;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em;">Klar kl.</div>
      <div style="font-weight:700;font-size:0.9rem;">${tidspunkt}</div>
    </div>` : `<div style="background:#f5f5f5;border-radius:10px;padding:10px 16px;text-align:center;min-width:110px;">
      <div style="font-size:0.72rem;color:#666;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em;">Ventetid</div>
      <div style="font-weight:700;font-size:0.9rem;">${ventetid}</div>
    </div>`,
    `<div style="background:#f5f5f5;border-radius:10px;padding:10px 16px;text-align:center;min-width:110px;">
      <div style="font-size:0.72rem;color:#666;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.04em;">Total</div>
      <div style="font-weight:700;font-size:0.9rem;">${formatPrice(total)}</div>
    </div>`,
    leveringType === 'levering' ? `<p style="width:100%;margin:6px 0 0;font-size:0.8rem;color:#666;text-align:center;">Bemærk: Levering kan tage 30 min til 1 time afhængigt af trafikken.</p>` : '',
  ].join('');

  document.getElementById('bekr-detaljer').innerHTML = [
    ...cart.map(v => `<div class="bekraeftelse-detaljer-linje">
      <span>${v.name.replace(/^\d+[A-Za-z]?\.\s*/, '')} ×${v.qty}</span>
      <span>${formatPrice(v.price * v.qty)}</span>
    </div>`),
    delivery ? `<div class="bekraeftelse-detaljer-linje" style="font-size:1rem;"><span>Levering</span><span>${formatPrice(delivery)}</span></div>` : '',
    `<div class="bekraeftelse-detaljer-linje"><span><strong>I alt</strong></span><span><strong>${formatPrice(total)}</strong></span></div>`,
  ].join('');

  lastOrderItems = cart.map(v => ({ ...v }));
  cart = [];
  activeCoupon = null;
  netsCheckout = null;
  zoneGodkendt = false;
  updateCartUI();
  showPage('ordre-bekraeftelse');
  const bw = document.querySelector('.bekraeftelse-wrapper');
  if (bw) { bw.classList.remove('go'); void bw.offsetWidth; bw.classList.add('go'); }
}

function kopierOrdrenr() {
  const el = document.getElementById('bekr-ordrenr');
  const nr = el?.dataset.ordrenr;
  if (!nr) return;
  navigator.clipboard.writeText(nr)
    .then(() => showToast(`Ordrenummer #${nr} kopieret`))
    .catch(() => showToast(`Ordrenummer: #${nr}`));
}

function genbestil() {
  if (!lastOrderItems.length) return;
  cart = lastOrderItems.map(v => ({ ...v }));
  updateCartUI();
  showPage('menu');
  openCart();
  showToast('Varerne er lagt i kurven igen');
}

// spinner keyframes (used by place-order button)
const _spinStyle = document.createElement('style');
_spinStyle.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(_spinStyle);

// BOOT
updateStatus();
setInterval(updateStatus, 60000);
updateHeaderHeight();

// Hent notice direkte — uafhængig af menu-load
fetch('config.json?t=' + Date.now())
  .then(r => r.ok ? r.json() : null).catch(() => null)
  .then(cfg => {
    if (cfg && cfg.notice) { siteConfig.notice = cfg.notice; }
    applyNotice();
  });

Promise.all([
  fetch('menu.json?t=' + Date.now()).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => null),
  fetch('config.json?t=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null)
]).then(([serverMenu, serverCfg]) => {
  const localMenu = localStorage.getItem('lp_menu');
  const localCfg  = localStorage.getItem('lp_config');
  // Always prefer server data — fall back to localStorage only if server is unavailable
  const data = serverMenu || (localMenu ? JSON.parse(localMenu) : null);
  const cfg  = serverCfg  || (localCfg  ? JSON.parse(localCfg)  : null);
  if (!data) throw new Error('no menu');
  menuData = data;
  if (cfg && cfg.hours)  siteConfig.hours  = Object.assign(siteConfig.hours,  cfg.hours);
  if (cfg && cfg.notice) siteConfig.notice = cfg.notice;
  updateStatus();
  updateHoursDisplay();
  applyNotice();
  buildKatGrid();
  buildSidebarNav();
  showMenuItems(window._currentKat || 'Pizza');
  setTimeout(observeGroupHeaders, 50);

  // Limited Edition image cycler
  const imgs = (menuData.LimitedEdition || []).filter(i => !i.hidden).map(i => i.img).filter(Boolean);
  if (imgs.length >= 2) {
    const container = document.querySelector('.kat-kort[data-kat="LimitedEdition"] .kat-kort-foto');
    const imgA = container && container.querySelector('img');
    if (imgA) {
      const sharedStyle = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 10%;transition:opacity 0.9s ease;';
      imgA.style.cssText += sharedStyle + 'opacity:1;';
      const imgB = new Image();
      imgB.className = imgA.className;
      imgB.alt = '';
      imgB.style.cssText = sharedStyle + 'opacity:0;';
      imgB.src = imgs[1];
      container.appendChild(imgB);
      let idx = 0, activeA = true;
      setInterval(() => {
        idx = (idx + 1) % imgs.length;
        if (activeA) { imgB.src = imgs[idx]; imgB.style.opacity='1'; imgA.style.opacity='0'; }
        else          { imgA.src = imgs[idx]; imgA.style.opacity='1'; imgB.style.opacity='0'; }
        activeA = !activeA;
      }, 3000);
    }
  }
}).catch(() => {
  const el = document.getElementById('menu-indhold');
  if (el) el.innerHTML = '<p style="padding:2rem;text-align:center;color:#c00;">Menuen kunne ikke indlæses. Genindlæs siden.</p>';
});

window.addEventListener('load', function() {
  const bg = document.getElementById('hero-bg');
  if (bg) bg.style.transform = 'scale(1)';
  updateHeaderHeight();
});

function updateHeaderHeight() {
  const sb = document.getElementById('status-bar');
  const stack = document.getElementById('top-bar-stack');
  const sbH = sb ? sb.offsetHeight : 0;
  const stackH = stack ? stack.offsetHeight : 0;
  document.documentElement.style.setProperty('--header-total-h', stackH + 'px');
  if (sbH) document.documentElement.style.setProperty('--sb-h', sbH + 'px');
  if (stackH) document.documentElement.style.setProperty('--topbar-h', stackH + 'px');
}
window.addEventListener('resize', updateHeaderHeight);

/* Interactions */
(function() {
  // Bounce on all buttons (Web Animations API bypasses CSS !important)
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.hero-btn,.hero-btn-ghost,.kurv-btn,.betaling-knap,.admin-gem-knap,.checkout-knap');
    if (!btn) return;
    btn.animate([
      { transform: 'scale(1) translateY(0)' },
      { transform: 'scale(0.90) translateY(4px)' },
      { transform: 'scale(1.08) translateY(-8px)' },
      { transform: 'scale(0.97) translateY(2px)' },
      { transform: 'scale(1) translateY(0)' }
    ], { duration: 420, easing: 'ease' });
    // Ripple only on filled buttons, not ghost
    if (btn.classList.contains('hero-btn-ghost')) return;
    const ripple = document.createElement('span');
    const r = btn.getBoundingClientRect();
    const sz = Math.max(r.width, r.height);
    ripple.className = 'lp-ripple';
    ripple.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX-r.left-sz/2}px;top:${e.clientY-r.top-sz/2}px;`;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });

  // Card bounce
  document.addEventListener('click', function(e) {
    const card = e.target.closest('.kat-kort');
    if (!card) return;
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'lpCardBounce 0.35s ease';
    card.addEventListener('animationend', () => { card.style.animation = ''; }, { once: true });
  });

  // + button wobble
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.tilføj-knap');
    if (!btn) return;
    btn.style.animation = 'none';
    void btn.offsetWidth;
    btn.style.animation = 'lpWobble 0.5s ease';
    btn.addEventListener('animationend', () => { btn.style.animation = ''; }, { once: true });
  });

  // Stagger menu items on category change
  const menuIndhold = document.getElementById('menu-indhold');
  if (menuIndhold) {
    new MutationObserver(function() {
      menuIndhold.querySelectorAll('.menu-item,.menu-item-featured').forEach((el, i) => {
        el.classList.remove('lp-item-enter');
        void el.offsetWidth;
        el.style.animationDelay = (i * 0.038) + 's';
        el.classList.add('lp-item-enter');
      });
    }).observe(menuIndhold, { childList: true, subtree: true });
  }

  // Search field
  const searchInput = document.getElementById('menu-search');
  if (searchInput) {
    searchInput.addEventListener('input',  function() { filterMenu(this.value); });
    searchInput.addEventListener('search', function() { filterMenu(this.value); });
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); filterMenu(this.value); }
    });
  }

  // Page transitions
  const origVisSide = window.visSide;
  if (typeof origVisSide === 'function') {
    window.visSide = function(id, pushState) {
      origVisSide(id, pushState);
      const el = document.getElementById('side-' + id);
      if (el) {
        el.classList.remove('lp-page-enter');
        void el.offsetWidth;
        el.classList.add('lp-page-enter');
      }
    };
  }
})();
