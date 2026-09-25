(function () {
  "use strict";

  // ---------- Queries ----------
  var section = document.querySelector(".cinema-scroll");
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var track = document.querySelector(".sights-track");
  var sightsControls = document.querySelector(".sights-controls");
  var prevBtn = document.querySelector(".sight-prev");
  var nextBtn = document.querySelector(".sight-next");
  var originalSightCards = Array.prototype.slice.call(document.querySelectorAll(".sight-card"));

  var langSwitcher = document.getElementById("langSwitcher");
  var langLabel = document.getElementById("langLabel");
  var noteButton = document.getElementById("noteButton");
  var backdrop = document.getElementById("modalBackdrop");
  var modalKicker = document.getElementById("modalKicker");
  var modalTitle = document.getElementById("modalTitle");
  var modalBody = document.getElementById("modalBody");
  var modalClose = document.getElementById("modalClose");

  // ---------- State ----------
  var targetMouseX = 0, targetMouseY = 0;
  var mouseX = 0, mouseY = 0;
  var targetScroll = 0, smoothScroll = 0;
  var initialized = false, rafPending = false;
  var sightCards = [];
  var originalSightCount = originalSightCards.length;
  var activeSight = originalSightCount;
  var currentLang = "en";
  var lastFocus = null;

  // ---------- Helpers ----------
  function clamp(v, min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    return Math.min(max, Math.max(min, v));
  }
  function smoothstep(e0, e1, v) {
    var x = clamp((v - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function segmentInOut(s, a, b, c, d) {
    var enter = smoothstep(a, b, s);
    var exit = smoothstep(c, d, s);
    return { enter: enter, exit: exit, active: enter * (1 - exit) };
  }
  function getScrollDistance() {
    return clamp(-section.getBoundingClientRect().top, 0,
      section.offsetHeight - window.innerHeight);
  }
  function setVar(name, value) { root.style.setProperty(name, value); }

  // ---------- i18n (EN / PT) ----------
  var I18N = {
    en: {
      logo: "Bosnia and Herzegovina", navIntro: "Intro", navBridge: "Bridge", navBazaar: "Bazaar", navRoutes: "Routes",
      intro: "A stone arch, emerald water, and a compact old city made for slow mornings, late light, and one unforgettable crossing.",
      tag1: "Old Bridge", tag2: "Neretva River", tag3: "UNESCO old city",
      bridgeH: "The bridge is the city's compass.",
      bridgeP: "Stari Most links the banks of the Neretva and anchors a historic quarter shaped by Ottoman, Mediterranean, and European layers.",
      fact1: "Original bridge completed", fact2: "Old Bridge Area inscribed by UNESCO",
      bazaarH: "The bazaar keeps Mostar close.",
      bazaarP: "Stone lanes, mosque courtyards, copper stalls, and riverside coffee stay within a short walk of Stari Most.",
      noteBtn: "Open old town notes",
      kicker1: "Old Bridge", title1: "Stari Most", desc1: "The stone arch over the Neretva and Mostar's main landmark.",
      kicker2: "Bazaar Street", title2: "Kujundziluk", desc2: "Copper shops, souvenirs, and the old bazaar lane by the bridge.",
      kicker3: "Viewpoint", title3: "Koski Mehmed Pasha Mosque", desc3: "A classic minaret view back toward Stari Most and the river.",
      kicker4: "Ottoman House", title4: "Kajtaz House", desc4: "A preserved residential house showing Mostar's Ottoman layers.",
      kicker5: "Museum", title5: "War Photo Exhibition", desc5: "A compact, moving stop for context on the city's recent history.",
      routesEyebrow: "Keep walking", routesTitle: "Three routes on foot",
      routesSub: "Everything in Mostar's old core is reachable in under twenty minutes on foot — pick a loop and go slow.",
      route1T: "Stari Most loop", route1M: "1.2 km · about 40 min", route1D: "Cross the bridge, descend to the Neretva banks, and climb to the mosque viewpoint for the classic photo.",
      route2T: "Bazaar lanes", route2M: "0.8 km · about 30 min", route2D: "Kujundziluk and the stone lanes, with stops for copper craft, souvenirs, and riverside coffee.",
      route3T: "History & layers", route3M: "2.1 km · about 1h 15", route3D: "Includes Kajtaz House and the War Photo Exhibition for context on the city's recent past.",
      footer: "Mostar · Bosnia and Herzegovina — a cinematic scroll story"
    },
    pt: {
      logo: "Bósnia e Herzegovina", navIntro: "Início", navBridge: "Ponte", navBazaar: "Bazar", navRoutes: "Rotas",
      intro: "Um arco de pedra, água esmeralda e uma cidade antiga compacta feita para manhãs tranquilas, luz do fim de tarde e uma travessia inesquecível.",
      tag1: "Ponte Velha", tag2: "Rio Neretva", tag3: "Cidade antiga UNESCO",
      bridgeH: "A ponte é a bússola da cidade.",
      bridgeP: "Stari Most liga as margens do Neretva e ancora um quarto histórico moldado por camadas otomanas, mediterrâneas e europeias.",
      fact1: "Ponte original concluída", fact2: "Área da Ponte Velha inscrita pela UNESCO",
      bazaarH: "O bazar mantém Mostar perto.",
      bazaarP: "Ruas de pedra, pátios de mesquitas, bancas de cobre e café à beira-rio ficam a poucos passos de Stari Most.",
      noteBtn: "Abrir notas da cidade velha",
      kicker1: "Ponte Velha", title1: "Stari Most", desc1: "O arco de pedra sobre o Neretva e o principal marco de Mostar.",
      kicker2: "Rua do Bazar", title2: "Kujundziluk", desc2: "Lojas de cobre, lembranças e a antiga rua do bazar junto à ponte.",
      kicker3: "Miradouro", title3: "Mesquita Koski Mehmed Pasha", desc3: "Uma vista clássica do minarete de volta a Stari Most e ao rio.",
      kicker4: "Casa Otomana", title4: "Casa Kajtaz", desc4: "Uma casa residencial preservada que mostra as camadas otomanas de Mostar.",
      kicker5: "Museu", title5: "Exposição de Fotos da Guerra", desc5: "Uma paragem compacta e comovente para contextualizar a história recente da cidade.",
      routesEyebrow: "Continue a pé", routesTitle: "Três rotas a pé",
      routesSub: "Tudo no centro antigo de Mostar fica a menos de vinte minutos a pé — escolha um circuito e vá devagar.",
      route1T: "Circuito Stari Most", route1M: "1,2 km · cerca de 40 min", route1D: "Atravesse a ponte, desça às margens do Neretva e suba ao miradouro da mesquita para a foto clássica.",
      route2T: "Ruas do Bazar", route2M: "0,8 km · cerca de 30 min", route2D: "Kujundziluk e as ruas de pedra, com paragens para artesanato de cobre, lembranças e café à beira-rio.",
      route3T: "História e camadas", route3M: "2,1 km · cerca de 1h15", route3D: "Inclui a Casa Kajtaz e a Exposição de Fotos da Guerra para contextualizar o passado recente da cidade.",
      footer: "Mostar · Bósnia e Herzegovina — uma história de scroll cinematográfica"
    }
  };

  var NOTES = {
    en: {
      kicker: "Old town notes",
      title: "Slow mornings in Mostar",
      items: [
        "Start before 9am at Stari Most — the light is soft and the crowds are still asleep.",
        "Walk Kujundziluk for copperware; prices drop a little away from the bridge entrance.",
        "The Koski Mehmed Pasha Mosque courtyard gives the postcard view back over the arch.",
        "Riverside coffee (bosanska kafa) is best on the west bank, facing the bridge.",
        "Wear flat shoes — the old lanes are steep, polished stone."
      ]
    },
    pt: {
      kicker: "Notas da cidade velha",
      title: "Manhãs tranquilas em Mostar",
      items: [
        "Comece antes das 9h em Stari Most — a luz é suave e as multidões ainda dormem.",
        "Percorra a Kujundziluk à procura de cobre; os preços baixam um pouco longe da entrada da ponte.",
        "O pátio da Mesquita Koski Mehmed Pasha oferece a vista postal de volta sobre o arco.",
        "O café à beira-rio (bosanska kafa) é melhor na margem oeste, de frente para a ponte.",
        "Use sapatos rasos — as ruas antigas são de pedra íngreme e polida."
      ]
    }
  };

  function applyLang(lang) {
    currentLang = lang;
    var dict = I18N[lang];
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute("data-i18n");
      if (dict[k] !== undefined) nodes[i].textContent = dict[k];
    }
    root.lang = (lang === "pt") ? "pt" : "en";
    if (langLabel) langLabel.textContent = lang.toUpperCase();
  }

  // ---------- Modal ----------
  function openModal(kicker, title, bodyHTML) {
    modalKicker.textContent = kicker || "";
    modalTitle.textContent = title || "";
    modalBody.innerHTML = bodyHTML || "";
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add("is-open"); });
    document.body.classList.add("modal-open");
    lastFocus = document.activeElement;
    if (modalClose) modalClose.focus();
  }
  function openSightModal(card) {
    var kicker = card.querySelector(".sight-kicker") ? card.querySelector(".sight-kicker").textContent : "";
    var title = card.querySelector("h3") ? card.querySelector("h3").textContent : "";
    var desc = card.querySelector("p") ? card.querySelector("p").textContent : "";
    var p = document.createElement("p");
    p.textContent = desc;
    modalKicker.textContent = kicker;
    modalTitle.textContent = title;
    modalBody.innerHTML = "";
    modalBody.appendChild(p);
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add("is-open"); });
    document.body.classList.add("modal-open");
    lastFocus = document.activeElement;
    if (modalClose) modalClose.focus();
  }
  function closeModal() {
    if (backdrop.hidden) return;
    backdrop.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    setTimeout(function () { backdrop.hidden = true; }, 300);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && backdrop && !backdrop.hidden) closeModal();
  });

  // ---------- Infinite sight slider ----------
  function setupSightSlider() {
    track.replaceChildren();
    for (var setIndex = 0; setIndex < 3; setIndex++) {
      for (var cardIndex = 0; cardIndex < originalSightCards.length; cardIndex++) {
        var card = originalSightCards[cardIndex];
        var clone = card.cloneNode(true);
        clone.dataset.sightIndex = String(setIndex * originalSightCount + cardIndex);
        track.appendChild(clone);
      }
    }
    sightCards = Array.prototype.slice.call(track.querySelectorAll(".sight-card"));
    activeSight = originalSightCount;

    sightCards.forEach(function (card) {
      card.addEventListener("click", function () {
        selectSightCard(card);
        openSightModal(card);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectSightCard(card);
          openSightModal(card);
        }
      });
    });

    track.addEventListener("transitionend", function (e) {
      if (e.propertyName !== "transform") return;
      normalizeSightSlider();
    });

    // Touch / pointer swipe support
    var swipeStartX = null, swipeStartY = null, swiped = false;
    track.addEventListener("pointerdown", function (e) {
      swipeStartX = e.clientX; swipeStartY = e.clientY; swiped = false;
    });
    track.addEventListener("pointermove", function (e) {
      if (swipeStartX === null || swiped) return;
      var dx = e.clientX - swipeStartX;
      var dy = e.clientY - swipeStartY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        swiped = true;
        moveSightSlider(dx > 0 ? -1 : 1);
        swipeStartX = null;
      }
    });
    function endSwipe() { swipeStartX = null; }
    track.addEventListener("pointerup", endSwipe);
    track.addEventListener("pointercancel", endSwipe);
    track.addEventListener("pointerleave", endSwipe);

    updateSightSlider();
  }

  function updateSightSlider() {
    if (!sightCards.length) return;
    var cardWidth = sightCards[0].offsetWidth;
    var gap = parseFloat(getComputedStyle(track).columnGap || "0");
    if (!isFinite(gap)) gap = 0;
    setVar("--sights-shift", (-(cardWidth + gap) * activeSight) + "px");
    sightCards.forEach(function (c) {
      c.classList.toggle("is-active", Number(c.dataset.sightIndex) === activeSight);
    });
  }

  function moveSightSlider(dir) {
    activeSight += dir;
    updateSightSlider();
  }

  function selectSightCard(card) {
    var i = Number(card.dataset.sightIndex);
    if (Number.isFinite(i)) {
      activeSight = i;
      updateSightSlider();
    }
  }

  function jumpSightSlider(i) {
    track.classList.add("is-jumping");
    activeSight = i;
    updateSightSlider();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        track.classList.remove("is-jumping");
      });
    });
  }

  function normalizeSightSlider() {
    if (activeSight >= originalSightCount * 2) {
      jumpSightSlider(activeSight - originalSightCount);
    } else if (activeSight < originalSightCount) {
      jumpSightSlider(activeSight + originalSightCount);
    }
  }

  // ---------- Animation frame ----------
  function requestTick() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(update);
  }

  function update() {
    rafPending = false;

    targetScroll = getScrollDistance();
    if (!initialized || reduceMotion.matches) {
      smoothScroll = targetScroll;
      initialized = true;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
    }
    if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;

    mouseX = lerp(mouseX, targetMouseX, 0.12);
    mouseY = lerp(mouseY, targetMouseY, 0.12);

    var frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
    var frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
    var progress = clamp(smoothScroll / 2700);
    var introExit = smoothstep(90, 650, smoothScroll);
    var sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
    var sightsEnter = Math.pow(sightsEnterRaw, 1.55);
    var sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
    var blurActive = clamp(frame2.active + frame3.active);
    var frame2Opacity = frame2.active * (1 - frame3.enter);
    var splitDrift = Math.pow(frame2.enter, 1.5);
    var panel2Opacity = frame2.active * (1 - frame2.exit);
    var panel3Opacity = frame3.active * (1 - frame3.exit);
    var backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
    var sharedHeroY = progress * -74;
    var sharedHeroScale = progress * 0.23;
    var sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
    var sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

    var mx = reduceMotion.matches ? 0 : mouseX;
    var my = reduceMotion.matches ? 0 : mouseY;

    setVar("--mx", mx.toFixed(4));
    setVar("--my", my.toFixed(4));

    setVar("--back-opacity", (1 - frame2.active * 0.06).toFixed(4));
    setVar("--back-x", (mouseX * -12).toFixed(2) + "px");
    setVar("--back-y", (mouseY * -4).toFixed(2) + "px");
    setVar("--back-scale", backScale.toFixed(4));
    setVar("--four-y", (10 + progress * 10).toFixed(2) + "vh");
    setVar("--four-scale", (0.78 + progress * 0.16).toFixed(4));
    setVar("--bazaar-y", (20 - progress * 8).toFixed(2) + "vh");
    setVar("--blur-px", (blurActive * 14).toFixed(2) + "px");
    setVar("--back-brightness", (1 - blurActive * 0.255).toFixed(4));
    setVar("--bazaar-blur-px", (frame2.active * 14).toFixed(2) + "px");
    setVar("--bazaar-brightness", (1 - frame2.active * 0.255 - frame3.active * 0.06).toFixed(4));
    setVar("--bazaar-saturation", (1 + frame3.active * 0.18).toFixed(4));

    setVar("--shade-opacity", "1");
    setVar("--shade-z", frame2.active > 0.02 ? "2" : "0");
    setVar("--shade-top-alpha", (blurActive * 0.465).toFixed(4));
    setVar("--shade-mid-alpha", (blurActive * 0.42).toFixed(4));
    setVar("--shade-bottom-alpha", (blurActive * 0.51).toFixed(4));

    setVar("--title-y", (introExit * -210).toFixed(2) + "px");
    setVar("--title-scale", (1 - introExit * 0.08).toFixed(4));
    setVar("--title-opacity", (1 - introExit).toFixed(4));

    setVar("--bridge-x", "calc(-50% + " + (mouseX * 18).toFixed(2) + "px)");
    setVar("--bridge-y", (mouseY * 8 + sharedHeroY - frame2.exit * 760).toFixed(2) + "px");
    setVar("--bridge-bottom", (5 - frame2.enter * 13).toFixed(2) + "vh");
    setVar("--bridge-width", (67.2 + frame2.enter * 37.8).toFixed(2) + "vw");
    setVar("--bridge-scale", (1.02 + sharedHeroScale + frame2.exit * 0.46).toFixed(4));

    setVar("--split-left-x", "calc(-50% + " + (-splitDrift * 46).toFixed(2) + "vw + " + (mouseX * 22).toFixed(2) + "px)");
    setVar("--split-left-y", (mouseY * 10 + sharedHeroY - splitDrift * 180).toFixed(2) + "px");
    setVar("--split-left-scale", (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));
    setVar("--split-right-x", "calc(-50% + " + (splitDrift * 46).toFixed(2) + "vw + " + (mouseX * 22).toFixed(2) + "px)");
    setVar("--split-right-y", (mouseY * 10 + sharedHeroY - splitDrift * 180).toFixed(2) + "px");
    setVar("--split-right-scale", (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));

    setVar("--frame2-opacity", frame2Opacity.toFixed(4));
    setVar("--frame2-x", "calc(-50% + " + (mouseX * 10).toFixed(2) + "px)");
    setVar("--frame2-y", "calc(-50% + " + (mouseY * 8 - frame2.exit * 150).toFixed(2) + "px)");
    setVar("--frame2-scale", (1.06 + frame2.enter * 0.08 + frame2.exit * 0.08).toFixed(4));

    setVar("--intro-copy-y", (introExit * 90).toFixed(2) + "px");
    setVar("--intro-copy-opacity", (1 - introExit).toFixed(4));

    setVar("--panel2-opacity", panel2Opacity.toFixed(4));
    setVar("--panel2-y", "calc(-50% + " + (-frame2.exit * 86 + (1 - frame2.enter) * 58).toFixed(2) + "px)");
    setVar("--panel3-opacity", panel3Opacity.toFixed(4));
    setVar("--panel3-y", "calc(-50% + " + (-frame3.exit * 86 + (1 - frame3.enter) * 58).toFixed(2) + "px)");

    setVar("--sights-opacity", sightsEnter.toFixed(4));
    setVar("--sights-controls-opacity", sightsControlsEnter.toFixed(4));
    sightsControls.classList.toggle("is-ready", sightsControlsEnter > 0.98);
    setVar("--sights-visibility", sightsEnter > 0.01 ? "visible" : "hidden");
    setVar("--sights-y", "0px");
    setVar("--sights-enter-x", ((1 - sightsEnter) * 420).toFixed(2) + "vw");
    setVar("--sights-scale", (1 / backScale).toFixed(4));
    setVar("--sights-top", sightsParentTop.toFixed(2) + "px");
    setVar("--sights-screen-top", sightsScreenTop.toFixed(2) + "px");

    if (Math.abs(smoothScroll - targetScroll) > 0.08 ||
        Math.abs(mouseX - targetMouseX) > 0.001 ||
        Math.abs(mouseY - targetMouseY) > 0.001) {
      requestTick();
    }
  }

  // ---------- Listeners ----------
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", function () {
    updateSightSlider();
    requestTick();
  });
  window.addEventListener("pointermove", function (e) {
    targetMouseX = e.clientX / window.innerWidth - 0.5;
    targetMouseY = e.clientY / window.innerHeight - 0.5;
    requestTick();
  }, { passive: true });

  if (prevBtn) prevBtn.addEventListener("click", function () { moveSightSlider(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { moveSightSlider(1); });

  if (langSwitcher) langSwitcher.addEventListener("click", function () {
    applyLang(currentLang === "en" ? "pt" : "en");
  });

  if (noteButton) noteButton.addEventListener("click", function () {
    var n = NOTES[currentLang];
    var html = "<ul>" + n.items.map(function (it) { return "<li>" + it + "</li>"; }).join("") + "</ul>";
    openModal(n.kicker, n.title, html);
  });

  // ---------- Init ----------
  setupSightSlider();
  requestTick();
})();
