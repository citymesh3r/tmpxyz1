(function () {
  "use strict";

  const DEFAULT_RATIO = 0.5;
  let uid = 0;

  function hasPath(src) {
    return typeof src === "string" && src.trim().length > 0 && !src.includes("TODO");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  }

  function makePlaceholder(label, color, note = "Missing media path or file not loaded yet") {
    const el = document.createElement("div");
    el.className = "placeholder-media";
    el.style.setProperty("--placeholder-color", color || "#334155");
    el.innerHTML = `<div><strong>${escapeHtml(label || "Media placeholder")}</strong><span>${escapeHtml(note)}</span></div>`;
    return el;
  }

  function createVideoEl(media = {}, label, lazy = true, opts = {}) {
    if (!hasPath(media.src)) return makePlaceholder(label, media.color);
    const v = document.createElement("video");
    v.className = "cmp-video";
    v.muted = opts.muted !== false;
    v.loop = opts.loop !== false;
    v.playsInline = true;
    v.preload = lazy ? "none" : "metadata";
    v.controls = Boolean(opts.controls);
    if (hasPath(media.poster)) v.poster = media.poster;
    v.dataset.src = media.src;
    v.dataset.loaded = "0";
    v.setAttribute("aria-label", label || "comparison video");
    return v;
  }

  function createImageEl(media = {}, label) {
    if (!hasPath(media.src)) return makePlaceholder(label, media.color);
    const img = document.createElement("img");
    img.className = "cmp-image";
    img.loading = "lazy";
    img.alt = label || "comparison image";
    img.dataset.src = media.src;
    img.dataset.loaded = "0";
    return img;
  }

  function loadMedia(root) {
    root.querySelectorAll("video[data-src][data-loaded='0']").forEach(v => {
      v.src = v.dataset.src;
      v.dataset.loaded = "1";
      try { v.load(); } catch (_) {}
    });
    root.querySelectorAll("img[data-src][data-loaded='0']").forEach(img => {
      img.src = img.dataset.src;
      img.dataset.loaded = "1";
    });
  }

  function unloadMedia(root) {
    root.querySelectorAll("video[data-loaded='1']").forEach(v => {
      try { v.pause(); } catch (_) {}
      v.removeAttribute("src");
      v.dataset.loaded = "0";
      try { v.load(); } catch (_) {}
    });
  }

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function setRatio(root, ratio) {
    const r = clamp(Number(ratio), 0.02, 0.98);
    root.style.setProperty("--split", `${r * 100}%`);
    root.dataset.ratio = String(r);
    const range = root.querySelector(".cmp-range");
    if (range) range.value = String(Math.round(r * 100));
  }

  function wireDrag(root, onChange) {
    const handle = root.querySelector(".cmp-handle");
    const range = root.querySelector(".cmp-range");
    let active = false;

    const updateFromClientX = (clientX) => {
      const rect = root.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      setRatio(root, ratio);
      if (onChange) onChange(ratio, root);
    };

    const down = (e) => {
      active = true;
      root.classList.add("is-dragging");
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      if (Number.isFinite(x)) updateFromClientX(x);
    };
    const move = (e) => {
      if (!active) return;
      e.preventDefault();
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      if (Number.isFinite(x)) updateFromClientX(x);
    };
    const up = () => {
      active = false;
      root.classList.remove("is-dragging");
    };

    root.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    if (range) {
      range.addEventListener("input", () => {
        const ratio = Number(range.value) / 100;
        setRatio(root, ratio);
        if (onChange) onChange(ratio, root);
      });
    }
    if (handle) {
      handle.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const step = e.key === "ArrowRight" ? 0.03 : -0.03;
        const ratio = clamp(Number(root.dataset.ratio || DEFAULT_RATIO) + step, 0, 1);
        setRatio(root, ratio);
        if (onChange) onChange(ratio, root);
      });
    }
  }

  function createComparisonSlider(opts = {}) {
    const id = opts.id || `cmp-${++uid}`;
    const kind = opts.kind || "video";
    const mediaOpts = opts.mediaOptions || {};
    const root = document.createElement("div");
    root.className = `comparison-slider ${kind === "image" ? "is-image" : "is-video"}`;
    root.id = id;
    root.dataset.ratio = String(opts.ratio || DEFAULT_RATIO);
    setRatio(root, opts.ratio || DEFAULT_RATIO);

    const bottom = document.createElement("div");
    bottom.className = "cmp-layer cmp-bottom";
    const top = document.createElement("div");
    top.className = "cmp-layer cmp-top";

    const make = (media, label) => kind === "image" ? createImageEl(media, label) : createVideoEl(media, label, true, mediaOpts);
    bottom.appendChild(make(opts.bottom, opts.bottomLabel));
    top.appendChild(make(opts.top, opts.topLabel));

    const labels = document.createElement("div");
    labels.className = "cmp-labels";
    labels.innerHTML = `<span class="top-label">${escapeHtml(opts.topLabel || "Top")}</span><span class="bottom-label">${escapeHtml(opts.bottomLabel || "Bottom")}</span>`;

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "cmp-handle";
    handle.setAttribute("aria-label", "Drag comparison slider");
    handle.innerHTML = `<span></span>`;

    const range = document.createElement("input");
    range.className = "cmp-range";
    range.type = "range";
    range.min = "0";
    range.max = "100";
    range.value = String(Math.round((opts.ratio || DEFAULT_RATIO) * 100));
    range.setAttribute("aria-label", "Comparison slider position");

    root.append(bottom, top, labels, handle, range);
    wireDrag(root, opts.onRatioChange);

    root.loadMedia = () => loadMedia(root);
    root.unloadMedia = () => unloadMedia(root);
    root.getVideos = () => Array.from(root.querySelectorAll("video"));
    root.setRatio = (ratio) => setRatio(root, ratio);
    root.setTop = (media, label) => {
      top.innerHTML = "";
      top.appendChild(make(media, label));
      labels.querySelector(".top-label").textContent = label || "Top";
    };
    root.setBottom = (media, label) => {
      bottom.innerHTML = "";
      bottom.appendChild(make(media, label));
      labels.querySelector(".bottom-label").textContent = label || "Bottom";
    };
    return root;
  }

  function setRatioMany(sliders, ratio, source) {
    sliders.forEach(slider => {
      if (!slider || slider === source) return;
      slider.setRatio ? slider.setRatio(ratio) : setRatio(slider, ratio);
    });
  }

  function getPlayable(videos) {
    return (videos || []).filter(v => v && v.tagName === "VIDEO");
  }

  function syncVideos(videos, controlsRoot, opts = {}) {
    const playable = getPlayable(videos);
    if (!playable.length) return { play(){}, pause(){}, restart(){}, sync(){}, videos: [] };
    const master = playable[0];
    let internal = false;

    const syncToMaster = () => {
      if (internal) return;
      internal = true;
      playable.slice(1).forEach(v => {
        if (Math.abs((v.currentTime || 0) - (master.currentTime || 0)) > 0.12) {
          try { v.currentTime = master.currentTime || 0; } catch (_) {}
        }
        try { v.playbackRate = master.playbackRate; } catch (_) {}
        if (!master.paused && v.paused) v.play().catch(() => {});
      });
      internal = false;
    };

    master.addEventListener("timeupdate", syncToMaster);
    master.addEventListener("seeked", syncToMaster);
    master.addEventListener("play", () => playable.forEach(v => { if (v !== master) v.play().catch(() => {}); }));
    master.addEventListener("pause", () => playable.forEach(v => { if (v !== master) v.pause(); }));

    const api = {
      videos: playable,
      play() { playable.forEach(v => v.play().catch(() => {})); },
      pause() { playable.forEach(v => v.pause()); },
      restart(playAfter = true) {
        playable.forEach(v => {
          try { v.pause(); } catch (_) {}
          try { v.currentTime = 0; } catch (_) {}
        });
        syncToMaster();
        if (playAfter) playable.forEach(v => v.play().catch(() => {}));
      },
      sync: syncToMaster
    };

    if (controlsRoot) {
      controlsRoot._syncApi = api;
      if (!controlsRoot.dataset.syncWired) {
        controlsRoot.dataset.syncWired = "1";
        controlsRoot.querySelector("[data-action='play']")?.addEventListener("click", () => controlsRoot._syncApi?.play?.());
        controlsRoot.querySelector("[data-action='pause']")?.addEventListener("click", () => controlsRoot._syncApi?.pause?.());
        controlsRoot.querySelector("[data-action='restart']")?.addEventListener("click", () => {
          controlsRoot._resetVisuals?.();
          controlsRoot._syncApi?.restart?.(true);
        });
      }
    }

    if (opts.autoplay) setTimeout(api.play, 120);
    return api;
  }

  function observeLazy(root, callback, opts = {}) {
    let done = false;
    const run = () => {
      if (done && opts.once !== false) return;
      done = true;
      callback();
    };
    if (!("IntersectionObserver" in window)) {
      run();
      return { refresh: run };
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        run();
        if (opts.once !== false) io.unobserve(root);
      });
    }, { rootMargin: opts.rootMargin || "300px 0px" });
    io.observe(root);
    return { refresh: run, disconnect: () => io.disconnect() };
  }

  window.CityMesh3RSlider = {
    createComparisonSlider,
    makePlaceholder,
    loadMedia,
    unloadMedia,
    syncVideos,
    observeLazy,
    hasPath,
    escapeHtml,
    setRatio,
    setRatioMany
  };
})();
