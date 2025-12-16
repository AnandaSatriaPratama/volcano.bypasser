(async () => {
  "use strict";

  // safety for environments with/without unsafeWindow
  const safeWindow =
    typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  // ---------- config ----------
  const host = location.hostname;
  const defaultTime = 8;
  const normalTime = 60;
  const ver = "3.0.3.3";
  const debug = true;

  // ---------- language & translations ----------
  let currentLanguage = "en"; // Force English only
  const translations = {
    en: {
      title: "Nan Bypasser",
      pleaseSolveCaptcha: "Please solve the CAPTCHA to continue",
      captchaSuccess: "CAPTCHA solved successfully",
      redirectingToWork: "Redirecting to Work.ink...",
      redirectingToWorkCountdown: "Redirecting to the Work.ink...",
      bypassSuccessCopy: "Bypass successful! Key copied to clipboard",
      waitingCaptcha: "Waiting for CAPTCHA...",
      pleaseReload: "Please reload the page...",
      reloading: "Reloading...",
      socialsdetected: "Socials detected, spoofing...",
      bypassSuccess: "Bypass successful",
      backToCheckpoint: "Returning to checkpoint...",
      captchaSuccessBypassing: "CAPTCHA solved, bypassing...",
      version: "Version v1.0.0",
      madeBy: "Made by Nan (Based on Dyrian)",
      autoRedirect: "Auto-redirect",
    },
  };

  function t(key, replacements = {}) {
    const map =
      translations[currentLanguage] && translations[currentLanguage][key]
        ? translations[currentLanguage][key]
        : key;
    let text = map;
    Object.keys(replacements).forEach((k) => {
      text = text.replace(`{${k}}`, replacements[k]);
    });
    return text;
  }

  // ---------- persistent setting keys ----------
  const STORAGE_KEY_DELAY = "nan_redirect_delay";
  const STORAGE_KEY_AUTO = "nan_auto_redirect";

  // selectedDelay: global variable used by GUI and callback
  let selectedDelay = parseInt(
    localStorage.getItem(STORAGE_KEY_DELAY) || "0",
    10
  );
  let autoRedirectEnabled = localStorage.getItem(STORAGE_KEY_AUTO) === "true";
  let redirectInProgress = false;

  // ---------- GUI: BypassPanel ----------
  class BypassPanel {
    constructor() {
      this.container = null;
      this.shadow = null;
      this.panel = null;
      this.statusText = null;
      this.statusDot = null;
      this.versionEl = null;
      this.creditEl = null;
      this.currentMessageKey = null;
      this.currentType = "info";
      this.currentReplacements = {};
      this.isMinimized = false;
      this.body = null;
      this.minimizeBtn = null;

      // slider elements
      this.sliderContainer = null;
      this.sliderValue = null;
      this.slider = null;
      this.startBtn = null;
      this.autoToggle = null;
      this.onStartCallback = null;
      this.redirectInProgress = false;

      this.init();
    }

    init() {
      try {
        this.createPanel();
        this.setupEventListeners();
      } catch (e) {
        if (debug) console.error("GUI init error", e);
      }
    }

    createPanel() {
      // Remove any existing panel first
      const existingPanel = document.querySelector("div[workink-bypass-panel]");
      if (existingPanel) {
        existingPanel.remove();
      }

      this.container = document.createElement("div");
      this.container.setAttribute("workink-bypass-panel", "true");

      this.shadow = this.container.attachShadow({
        mode: "closed",
      });

      const style = document.createElement("style");
      style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

* { margin:0; padding:0; box-sizing:border-box; }

@keyframes fadeInScale {
    from { opacity:0; transform:scale(0.9) translateY(20px); }
    to { opacity:1; transform:scale(1) translateY(0); }
}

@keyframes orangeGlow {
    0%, 100% {
        box-shadow: 0 0 5px rgba(255, 140, 0, 0.4),
                    0 0 10px rgba(255, 140, 0, 0.3),
                    0 0 20px rgba(255, 140, 0, 0.2),
                    inset 0 0 10px rgba(255, 140, 0, 0.1);
    }
    50% {
        box-shadow: 0 0 10px rgba(255, 140, 0, 0.6),
                    0 0 20px rgba(255, 140, 0, 0.4),
                    0 0 30px rgba(255, 140, 0, 0.3),
                    inset 0 0 15px rgba(255, 140, 0, 0.15);
    }
}

@keyframes statusGlow {
    0%, 100% {
        box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
    }
    50% {
        box-shadow: 0 0 15px currentColor, 0 0 30px currentColor, 0 0 45px currentColor;
    }
}

@keyframes slideDown {
    from { opacity: 0; max-height: 0; transform: translateY(-10px); }
    to { opacity: 1; max-height: 500px; transform: translateY(0); }
}

.panel-container {
    position: fixed;
    top: 24px;
    right: 24px;
    width: 380px;
    z-index: 2147483647;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
    animation: fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.panel {
    background: #1a0f00;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(255, 140, 0, 0.15);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9),
                0 0 0 1px rgba(255, 140, 0, 0.1);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    animation: orangeGlow 2s ease-in-out infinite;
}

.panel:hover {
    border-color: rgba(255, 140, 0, 0.25);
    transform: translateY(-2px);
}

.header {
    background: linear-gradient(135deg, #1a0f00 0%, #261700 100%);
    padding: 20px;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 140, 0, 0.1);
}

.title {
    font-size: 16px;
    font-weight: 700;
    color: #ff8c00;
    letter-spacing: 1px;
}

.minimize-btn {
    background: transparent;
    border: 1px solid rgba(255, 140, 0, 0.3);
    color: #ff8c00;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 16px;
    font-weight: 700;
}

.minimize-btn:hover {
    background: rgba(255, 140, 0, 0.1);
    border-color: #ff8c00;
    transform: rotate(180deg);
}

.status-section {
    padding: 20px;
    position: relative;
    background: #1a0f00;
}

.status-box {
    background: #261700;
    border: 1px solid rgba(255, 140, 0, 0.2);
    border-radius: 14px;
    padding: 16px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

.status-content {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 1;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: statusGlow 2s ease-in-out infinite;
    flex-shrink: 0;
    position: relative;
}

.status-dot::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid currentColor;
    opacity: 0.3;
}

.status-dot.info { background: #ff8c00; color: #ff8c00; }
.status-dot.social { background: #ff4444; color: #ff4444; }
.status-dot.bypassing { background: #ffa500; color: #ffa500; }
.status-dot.success { background: #00cc66; color: #00cc66; }
.status-dot.warning { background: #ff8c00; color: #ff8c00; }
.status-dot.error { background: #ff4444; color: #ff4444; }

.status-text {
    color: #e6e6e6;
    font-size: 12px;
    font-weight: 500;
    flex: 1;
    line-height: 1.5;
    letter-spacing: 0.2px;
}

.panel-body {
    max-height: 400px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 1;
}

.panel-body.hidden {
    max-height: 0;
    opacity: 0;
}

.info-section {
    padding: 20px;
    background: #1a0f00;
    text-align: center;
    border-top: 1px solid rgba(255, 140, 0, 0.1);
}

.version, .credit {
    color: #b3b3b3;
    font-size: 10px;
    font-weight: 500;
    margin-bottom: 6px;
    letter-spacing: 0.4px;
}

.links {
    display: flex;
    justify-content: center;
    gap: 12px;
    font-size: 10px;
    margin-top: 10px;
    text-transform: uppercase;
}

.links a {
    color: #ff8c00;
    text-decoration: none;
    transition: all 0.2s ease;
    font-weight: 600;
    letter-spacing: 0.8px;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 140, 0, 0.2);
}

.links a:hover {
    background: rgba(255, 140, 0, 0.1);
    border-color: #ff8c00;
}

.slider-container {
    display: none;
    padding: 0;
    animation: slideDown 0.3s ease;
    margin-top: 12px;
}

.slider-container.active {
    display: block;
}

.slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 20px 8px 20px;
}

.slider-label {
    color: #cccccc;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
}

.slider-value {
    color: #ff8c00;
    font-size: 12px;
    font-weight: 700;
    background: rgba(255, 140, 0, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 140, 0, 0.2);
    min-width: 40px;
    text-align: center;
}

.slider-track {
    margin: 0 20px 12px 20px;
}

.slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #332200;
    outline: none;
    -webkit-appearance: none;
    cursor: pointer;
}

.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ff8c00;
    cursor: pointer;
    box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.2);
}

.auto-redirect-container {
    margin: 0 20px 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: #261700;
    border: 1px solid rgba(255, 140, 0, 0.2);
    border-radius: 10px;
}

.toggle-label {
    color: #e6e6e6;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
}

.toggle-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #332200;
    transition: all 0.3s ease;
    border-radius: 24px;
    border: 1px solid rgba(255, 140, 0, 0.2);
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 2.5px;
    background: #666666;
    transition: all 0.3s ease;
    border-radius: 50%;
}

input:checked + .toggle-slider {
    background: #ff8c00;
    border-color: #ff8c00;
}

input:checked + .toggle-slider:before {
    transform: translateX(22px);
    background: #fff;
}

.start-btn {
    width: calc(100% - 40px);
    margin: 0 20px 16px 20px;
    background: #ff8c00;
    color: #000;
    border: none;
    padding: 12px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
}

.start-btn:hover {
    background: #ff9933;
    transform: translateY(-1px);
}

.start-btn.hidden {
    display: none;
}

@media (max-width: 480px) {
    .panel-container {
        top: 10px;
        right: 10px;
        left: 10px;
        width: auto;
    }
}
      `;
      this.shadow.appendChild(style);

      const lastDelay = parseInt(
        localStorage.getItem(STORAGE_KEY_DELAY) || "0",
        10
      );
      const autoEnabled = localStorage.getItem(STORAGE_KEY_AUTO) === "true";

      const panelHTML = `
<div class="panel-container">
  <div class="panel">
    <div class="header">
      <div class="title">Nan Bypasser</div>
      <button class="minimize-btn" id="minimize-btn">−</button>
    </div>

    <div class="status-section">
      <div class="status-box">
        <div class="status-content">
          <div class="status-dot info" id="status-dot"></div>
          <div class="status-text" id="status-text">${t(
            "pleaseSolveCaptcha"
          )}</div>
        </div>
      </div>

      <div class="slider-container" id="slider-container">
        <div class="slider-header">
          <span class="slider-label">Redirect delay:</span>
          <span class="slider-value" id="slider-value">${lastDelay}s</span>
        </div>
        <div class="slider-track">
          <input type="range" min="0" max="60" value="${lastDelay}" class="slider" id="delay-slider">
        </div>
        <div class="auto-redirect-container">
          <label class="toggle-switch">
            <input type="checkbox" id="auto-toggle" ${
              autoEnabled ? "checked" : ""
            }>
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${t("autoRedirect")}</span>
        </div>
        <button class="start-btn ${
          autoEnabled ? "hidden" : ""
        }" id="start-btn">Start Redirect</button>
      </div>
    </div>

    <div class="panel-body" id="panel-body">
      <div class="info-section">
        <div class="version" id="version">${t("version")}</div>
        <div class="credit" id="credit">${t("madeBy")}</div>
        <div class="links">
          <a href="https://discord.gg/TJXX8gJGgF" target="_blank">Discord</a>
        </div>
      </div>
    </div>
  </div>
</div>
      `;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = panelHTML;
      this.shadow.appendChild(wrapper.firstElementChild);

      // elements
      this.panel = this.shadow.querySelector(".panel");
      this.statusText = this.shadow.querySelector("#status-text");
      this.statusDot = this.shadow.querySelector("#status-dot");
      this.versionEl = this.shadow.querySelector("#version");
      this.creditEl = this.shadow.querySelector("#credit");
      this.body = this.shadow.querySelector("#panel-body");
      this.minimizeBtn = this.shadow.querySelector("#minimize-btn");
      this.sliderContainer = this.shadow.querySelector("#slider-container");
      this.sliderValue = this.shadow.querySelector("#slider-value");
      this.slider = this.shadow.querySelector("#delay-slider");
      this.startBtn = this.shadow.querySelector("#start-btn");
      this.autoToggle = this.shadow.querySelector("#auto-toggle");

      // attach container to document
      try {
        document.documentElement.appendChild(this.container);
      } catch (e) {
        setTimeout(() => {
          try {
            document.documentElement.appendChild(this.container);
          } catch (_) {}
        }, 200);
      }

      // Initialize slider
      try {
        selectedDelay = parseInt(
          localStorage.getItem(STORAGE_KEY_DELAY) || "0",
          10
        );
        this.slider.value = String(selectedDelay);
        this.sliderValue.textContent = `${selectedDelay}s`;
      } catch (e) {
        if (debug) console.warn("Failed to initialize slider from storage", e);
      }
    }

    setupEventListeners() {
      this.minimizeBtn.addEventListener("click", () => {
        this.isMinimized = !this.isMinimized;
        this.body.classList.toggle("hidden");
        this.minimizeBtn.textContent = this.isMinimized ? "+" : "−";
      });

      // auto-redirect toggle
      this.autoToggle.addEventListener("change", (e) => {
        autoRedirectEnabled = e.target.checked;
        try {
          localStorage.setItem(STORAGE_KEY_AUTO, String(autoRedirectEnabled));
        } catch (err) {
          if (debug)
            console.warn("Could not save auto-redirect to localStorage", err);
        }

        if (autoRedirectEnabled) {
          this.startBtn.classList.add("hidden");
        } else {
          this.startBtn.classList.remove("hidden");
        }

        if (debug) console.log("[Debug] Auto-redirect:", autoRedirectEnabled);
      });

      // slider change
      this.slider.addEventListener("input", (e) => {
        selectedDelay = parseInt(e.target.value, 10);
        this.sliderValue.textContent = `${selectedDelay}s`;
        try {
          localStorage.setItem(STORAGE_KEY_DELAY, String(selectedDelay));
        } catch (err) {
          if (debug) console.warn("Could not save delay to localStorage", err);
        }
      });

      // start button
      this.startBtn.addEventListener("click", () => {
        if (this.redirectInProgress) {
          if (debug)
            console.log("[Debug] Start button: redirect already in progress");
          return;
        }

        if (this.onStartCallback) {
          this.redirectInProgress = true;
          redirectInProgress = true;
          try {
            this.onStartCallback(selectedDelay);
          } catch (err) {
            if (debug) console.error("[Debug] onStartCallback error", err);
            this.redirectInProgress = false;
            redirectInProgress = false;
          }
        }
      });
    }

    show(messageKeyOrTitle, typeOrSubtitle = "info", replacements = {}) {
      this.currentMessageKey = messageKeyOrTitle;
      this.currentType =
        typeof typeOrSubtitle === "string" &&
        ["info", "success", "bypassing", "social", "warning", "error"].includes(
          typeOrSubtitle
        )
          ? typeOrSubtitle
          : "info";
      this.currentReplacements = replacements;

      let message = "";
      if (
        translations[currentLanguage] &&
        translations[currentLanguage][messageKeyOrTitle]
      ) {
        message = t(messageKeyOrTitle, replacements);
      } else {
        message = messageKeyOrTitle;
      }

      if (this.statusText) this.statusText.textContent = message;
      if (this.statusDot)
        this.statusDot.className = `status-dot ${this.currentType}`;
    }

    showCaptchaComplete() {
      if (this.redirectInProgress || redirectInProgress) {
        if (debug)
          console.log(
            "[Debug] showCaptchaComplete: redirect already in progress, ignoring"
          );
        return;
      }

      this.sliderContainer.classList.add("active");
      this.sliderContainer.style.display = "block";

      this.show("bypassSuccess", "success");
      this.sliderValue.textContent = `${selectedDelay}s`;
      try {
        this.slider.value = String(selectedDelay);
      } catch (e) {}

      if (debug)
        console.log(
          "[Debug] Slider container shown, autoRedirectEnabled:",
          autoRedirectEnabled
        );

      if (autoRedirectEnabled) {
        if (debug)
          console.log(
            "[Debug] Auto-redirect is enabled, starting auto countdown with delay:",
            selectedDelay
          );

        this.redirectInProgress = true;
        redirectInProgress = true;

        setTimeout(() => {
          if (this.onStartCallback) {
            if (debug)
              console.log(
                "[Debug] Calling onStartCallback with delay:",
                selectedDelay
              );
            try {
              this.onStartCallback(selectedDelay);
            } catch (err) {
              if (debug)
                console.error("[Debug] Auto-redirect callback error", err);
              this.redirectInProgress = false;
              redirectInProgress = false;
            }
          } else {
            if (debug) console.warn("[Debug] onStartCallback is not set!");
            this.redirectInProgress = false;
            redirectInProgress = false;
          }
        }, 500);
      }
    }

    setCallback(callback) {
      this.onStartCallback = callback;
    }

    startCountdown(seconds) {
      if (debug)
        console.log("[Debug] startCountdown called with seconds:", seconds);

      const sliderHeader = this.shadow.querySelector(".slider-header");
      const sliderTrack = this.shadow.querySelector(".slider-track");
      if (sliderHeader) sliderHeader.style.display = "none";
      if (sliderTrack) sliderTrack.style.display = "none";
      if (this.startBtn) this.startBtn.style.display = "none";

      try {
        if (this.startBtn) this.startBtn.disabled = true;
      } catch (e) {}

      let remaining = Math.max(0, parseInt(seconds, 10) || 0);

      if (this.statusText)
        this.statusText.textContent = `Redirecting in ${remaining}s...`;
      if (this.statusDot) this.statusDot.className = "status-dot info";

      const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
          if (this.statusText)
            this.statusText.textContent = `Redirecting in ${remaining}s...`;
        } else {
          clearInterval(interval);
          if (this.statusText) this.statusText.textContent = `Redirecting...`;
        }
      }, 1000);

      return {
        stop: () => clearInterval(interval),
      };
    }
  }

  // ---------- instantiate GUI ----------
  let panel = null;
  try {
    panel = new BypassPanel();
    panel.show("pleaseSolveCaptcha", "info");
  } catch (e) {
    if (debug) console.error("Failed to create panel", e);
  }

  // ---------- bypass logic ----------

  if (host.includes("key.volcano.wtf")) handleVolcano();
  else if (host.includes("work.ink")) handleWorkInk();

  // ---------- Full Volcano handler ----------
  function handleVolcano() {
    if (panel) panel.show("pleaseSolveCaptcha", "info");
    if (debug) console.log("[Debug] Waiting Captcha");

    let alreadyDoneContinue = false;
    let alreadyDoneCopy = false;
    let copyButtonClicked = false;

    // Function to automatically copy key to clipboard
    function autoCopyKey() {
      // First, try to find and click the copy button
      const copyButtons = document.querySelectorAll(
        '#copy-key-btn, .copy-btn, [aria-label="Copy"], button[class*="copy"], button[onclick*="copy"]'
      );

      for (const copyBtn of copyButtons) {
        if (copyBtn && copyBtn.offsetParent !== null) {
          // Check if button is visible
          try {
            copyBtn.click();
            if (debug) console.log("[Debug] Copy button clicked");

            // Try to get the key from the button's context or nearby elements
            let key = findKeyNearElement(copyBtn);
            if (key) {
              if (typeof GM_setClipboard !== "undefined") {
                GM_setClipboard(key);
                if (panel) panel.show("bypassSuccessCopy", "success");
                if (debug) console.log("[Debug] Key copied to clipboard:", key);
                return true;
              }
            }
          } catch (err) {
            if (debug) console.log("[Debug] Error clicking copy button", err);
          }
        }
      }

      // If copy button not found or didn't work, try to find key in page
      return findAndCopyKeyFromPage();
    }

    // Function to find key near the copy button
    function findKeyNearElement(element) {
      // Look for key in parent elements
      let parent = element.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        // Check up to 5 levels up
        const key = findKeyInElement(parent);
        if (key) return key;
        parent = parent.parentElement;
      }

      // Look for key in sibling elements
      const container = element.closest(
        ".flex, .container, .mx-auto, .text-center"
      );
      if (container) {
        const key = findKeyInElement(container);
        if (key) return key;
      }

      return null;
    }

    // Function to find key in specific element
    function findKeyInElement(element) {
      const keySelectors = [
        ".text-3xl.font-bold",
        ".key-value",
        "[data-key]",
        ".font-mono",
        ".break-all",
        "code",
        ".text-center.text-2xl",
        ".text-xl",
        ".text-2xl",
        ".text-lg.font-bold",
      ];

      for (const selector of keySelectors) {
        const elements = element.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (text && text.length > 10 && /^[a-zA-Z0-9\-_=+]+$/.test(text)) {
            if (debug) console.log("[Debug] Found key near copy button:", text);
            return text;
          }
        }
      }
      return null;
    }

    // Function to find and copy key from entire page
    function findAndCopyKeyFromPage() {
      const keySelectors = [
        ".text-3xl.font-bold",
        ".key-value",
        "[data-key]",
        ".font-mono",
        ".break-all",
        "code",
        ".text-center.text-2xl",
        ".text-xl",
        ".text-2xl",
        ".text-lg.font-bold",
      ];

      for (const selector of keySelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim();
          // Check if it looks like a key (alphanumeric, usually longer than 10 chars)
          if (text && text.length > 10 && /^[a-zA-Z0-9\-_=+]+$/.test(text)) {
            if (debug) console.log("[Debug] Found key in page:", text);

            // Copy to clipboard using GM_setClipboard
            if (typeof GM_setClipboard !== "undefined") {
              GM_setClipboard(text);
              if (panel) panel.show("bypassSuccessCopy", "success");
              if (debug)
                console.log("[Debug] Key automatically copied to clipboard");
              return true;
            }
          }
        }
      }
      return false;
    }

    function actOnCheckpoint(node) {
      if (!alreadyDoneContinue) {
        const buttons =
          node && node.nodeType === 1
            ? node.matches(
                '#primaryButton[type="submit"], button[type="submit"], a, input[type=button], input[type=submit]'
              )
              ? [node]
              : node.querySelectorAll(
                  '#primaryButton[type="submit"], button[type="submit"], a, input[type=button], input[type=submit]'
                )
            : document.querySelectorAll(
                '#primaryButton[type="submit"], button[type="submit"], a, input[type=button], input[type=submit]'
              );

        for (const btn of buttons) {
          const text = (btn.innerText || btn.value || "").trim().toLowerCase();
          if (text.includes("continue") || text.includes("next step")) {
            const disabled =
              btn.disabled || btn.getAttribute("aria-disabled") === "true";
            const style = getComputedStyle(btn);
            const visible =
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              btn.offsetParent !== null;
            if (visible && !disabled) {
              alreadyDoneContinue = true;
              if (panel) panel.show("captchaSuccess", "success");
              if (debug) console.log("[Debug] Captcha Solved");

              for (const btn of buttons) {
                const currentBtn = btn;
                const currentPanel = panel;

                setTimeout(() => {
                  try {
                    currentBtn.click();
                    if (currentPanel)
                      currentPanel.show("redirectingToWork", "info");
                    if (debug) console.log("[Debug] Clicking Continue");
                  } catch (err) {
                    if (debug) console.log("[Debug] No Continue Found", err);
                  }
                }, 300);
              }
              return true;
            }
          }
        }
      }

      // Auto copy key when page is ready
      if (!copyButtonClicked) {
        const success = autoCopyKey();
        if (success) {
          copyButtonClicked = true;
          alreadyDoneCopy = true;

          // Also try to click any visible copy buttons repeatedly
          setInterval(() => {
            const copyButtons = document.querySelectorAll(
              '#copy-key-btn, .copy-btn, [aria-label="Copy"]'
            );
            for (const copyBtn of copyButtons) {
              if (copyBtn && copyBtn.offsetParent !== null) {
                try {
                  copyBtn.click();
                  if (debug) console.log("[Debug] Copy button spam click");
                } catch (err) {
                  if (debug)
                    console.log("[Debug] Error in copy button spam", err);
                }
              }
            }
          }, 1000);

          return true;
        }
      }

      return false;
    }

    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              if (actOnCheckpoint(node)) {
                if (alreadyDoneCopy) {
                  mo.disconnect();
                  return;
                }
              }
            }
          }
        }
        if (mutation.type === "attributes" && mutation.target.nodeType === 1) {
          if (actOnCheckpoint(mutation.target)) {
            if (alreadyDoneCopy) {
              mo.disconnect();
              return;
            }
          }
        }
      }
    });

    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "style", "class"],
    });

    // Also try to copy key on page load and periodically
    setTimeout(() => {
      if (!copyButtonClicked) {
        autoCopyKey();
      }
    }, 1000);

    // Periodic check for copy button
    const copyInterval = setInterval(() => {
      if (!copyButtonClicked) {
        const success = autoCopyKey();
        if (success) {
          copyButtonClicked = true;
          clearInterval(copyInterval);
        }
      } else {
        clearInterval(copyInterval);
      }
    }, 500);

    if (actOnCheckpoint()) {
      if (alreadyDoneCopy) {
        mo.disconnect();
      }
    }
  }

  // Handler for WORK.INK (remain the same as before)
  function handleWorkInk() {
    if (panel) panel.show("pleaseSolveCaptcha", "info");

    let sessionController = undefined;
    let sendMessage = undefined;
    let LinkInfoFn = undefined;
    let LinkDestinationFn = undefined;
    let bypassTriggered = false;
    let destinationReceived = false;
    let destinationProcessed = false;
    let socialCheckInProgress = false;
    let destinationURL = null;

    const map = {
      onLI: ["onLinkInfo"],
      onLD: ["onLinkDestination"],
    };
    const types = {
      an: "c_announce",
      mo: "c_monetization",
      ss: "c_social_started",
      rr: "c_recaptcha_response",
      hr: "c_hcaptcha_response",
      tr: "c_turnstile_response",
      ad: "c_adblocker_detected",
      fl: "c_focus_lost",
      os: "c_offers_skipped",
      ok: "c_offer_skipped",
      fo: "c_focus",
      wp: "c_workink_pass_available",
      wu: "c_workink_pass_use",
      pi: "c_ping",
      kk: "c_keyapp_key",
    };

    function getName(obj, candidates = null) {
      if (!obj || typeof obj !== "object")
        return {
          fn: null,
          index: -1,
          name: null,
        };
      if (candidates) {
        for (let i = 0; i < candidates.length; i++) {
          const name = candidates[i];
          if (typeof obj[name] === "function")
            return {
              fn: obj[name],
              index: i,
              name,
            };
        }
      } else {
        for (let i in obj) {
          if (typeof obj[i] === "function" && obj[i].length == 2)
            return {
              fn: obj[i],
              name: i,
            };
        }
      }
      return {
        fn: null,
        index: -1,
        name: null,
      };
    }

    function triggerBypass(reason) {
      if (bypassTriggered) return;
      bypassTriggered = true;
      if (debug) console.log("[Debug] trigger Bypass via:", reason);
      if (panel) panel.show("captchaSuccessBypassing", "bypassing");

      function keepSpoofing() {
        if (destinationReceived) return;
        spoofSocials();
        spoofWorkink();

        // Check for "Go to Destination" button to detect captcha completion
        const gtdButton = document.querySelector("button.large.accessBtn");
        if (gtdButton && gtdButton.textContent.includes("Go To Destination")) {
          const loader = gtdButton.querySelector(".loader-btn");
          // If loader is not present or hidden, captcha is likely solved
          if (
            !loader ||
            loader.style.display === "none" ||
            !gtdButton.classList.contains("button-disabled")
          ) {
            if (debug)
              console.log(
                "[Debug] Go to Destination button ready, captcha solved"
              );
            return;
          }
        }

        setTimeout(keepSpoofing, 3000);
      }
      keepSpoofing();
    }

    async function spoofSocials() {
      if (!LinkInfoFn || socialCheckInProgress) return;
      const socials = LinkInfoFn.socials || LinkInfoFn?.socials || [];

      // Log total number of socials found
      if (debug)
        console.log(`[Debug] Found ${socials.length} social(s) to spoof`);

      if (socials.length > 1) {
        socialCheckInProgress = true;

        // Show initial count
        if (panel)
          panel.show(`Spoofing socials: 0/${socials.length}`, "social");

        // Log each social being spoofed
        for (let i = 0; i < socials.length; i++) {
          const soc = socials[i];
          try {
            // Extract social platform name from URL if possible
            let platformName = "Unknown";
            try {
              const url = new URL(soc.url);
              platformName = url.hostname.replace("www.", "").split(".")[0];
              platformName =
                platformName.charAt(0).toUpperCase() + platformName.slice(1);
            } catch (e) {
              platformName = soc.url.substring(0, 30) + "...";
            }

            if (debug)
              console.log(
                `[Debug] Spoofing social ${i + 1}/${
                  socials.length
                }: ${platformName} (${soc.url})`
              );

            if (sendMessage) {
              sendMessage.call(sessionController, types.ss, {
                url: soc.url,
              });

              // Update panel with progress
              if (panel)
                panel.show(
                  `Spoofing socials: ${i + 1}/${
                    socials.length
                  } (${platformName})`,
                  "social"
                );

              if (debug)
                console.log(`[Debug] ✓ Successfully spoofed ${platformName}`);
            }
          } catch (e) {
            if (debug)
              console.error(`[Debug] ✗ Error spoofing social ${i + 1}:`, e);
          }

          // 1 second delay between each social
          if (i < socials.length - 1) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }

        if (debug)
          console.log(
            `[Debug] Finished spoofing all ${socials.length} socials`
          );

        // Reload after spoofing all socials
        setTimeout(() => {
          if (panel) panel.show("reloading", "info");
          if (debug)
            console.log("[Debug] Reloading page after social spoof...");
          window.location.reload();
        }, 1500);
      } else if (socials.length === 1) {
        // Handle single social case - requires captcha
        if (debug)
          console.log("[Debug] Only 1 social detected, waiting for captcha...");
        triggerBypass("social-check-complete");
        // Don't spoof automatically, let captcha solve first
        return;
      } else {
        // No socials to spoof
        if (debug)
          console.log("[Debug] No socials detected, waiting for captcha...");
        triggerBypass("social-check-complete");
        return;
      }
    }

    function spoofWorkink() {
        if (!LinkInfoFn) return;
        const socials = LinkInfoFn.socials || [];
        for (let i = 0; i < socials.length; i++) {
            const soc = socials[i];
            try {
                if (sendMessage) sendMessage.call(this, types.ss, {
                    url: soc.url
                });
            } catch (e) {
                if (debug) console.error(e);
            }
        }

        const monetizations = sessionController?.monetizations || [];
        for (let i = 0; i < monetizations.length; i++) {
            const monetization = monetizations[i];
            try {
                const monetizationId = monetization.id;
                const monetizationSendMessage = monetization.sendMessage;
                switch (monetizationId) {
                    case 22:
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'read'
                        });
                        break;
                    case 25:
                        // Opera GX
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'start'
                        });
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'installClicked'
                        });
                        try {
                            fetch('/_api/v2/affiliate/operaGX', {
                                method: 'GET',
                                mode: 'no-cors'
                            });
                        } catch (_) {}
                        setTimeout(() => {
                            try {
                                fetch('https://work.ink/_api/v2/callback/operaGX', {
                                    method: 'POST',
                                    mode: 'no-cors',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        'noteligible': true
                                    })
                                });
                            } catch (_) {}
                        }, 5000);
                        break;
                    case 34:
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'start'
                        });
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'installClicked'
                        });
                        break;
                    case 71:
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'start'
                        });
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'installed'
                        });
                        break;
                    case 45:
                    case 57:
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'installed'
                        });
                        break;
                    // Tambahkan case untuk Solid Browser
                    case 72: // ID untuk Solid Browser (perlu disesuaikan dengan ID sebenarnya)
                    case 73: // Atau ID lainnya untuk Solid Browser
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'start'
                        });
                        monetizationSendMessage && monetizationSendMessage.call(monetization, {
                            event: 'installClicked'
                        });
                        try {
                            fetch('/_api/v2/affiliate/solidBrowser', {
                                method: 'GET',
                                mode: 'no-cors'
                            });
                        } catch (_) {}
                        setTimeout(() => {
                            try {
                                fetch('https://work.ink/_api/v2/callback/solidBrowser', {
                                    method: 'POST',
                                    mode: 'no-cors',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        'noteligible': true
                                    })
                                });
                            } catch (_) {}
                        }, 5000);
                        break;
                    default:
                        break;
                }
            } catch (e) {
                if (debug) console.error('[Debug] Error faking monetization:', e);
            }
        }
    }

    function createSendMessage() {
      return function (...args) {
        const packet_type = args[0];
        if (packet_type !== types.pi) {
          if (debug) console.log("[Debug] Message sent:", packet_type, args[1]);
        }
        if (packet_type === types.tr) triggerBypass("tr");
        return sendMessage ? sendMessage.apply(this, args) : undefined;
      };
    }

    function createLinkInfo() {
      return async function (...args) {
        const [info] = args;
        LinkInfoFn = info;
        try {
          Object.defineProperty(info, "isAdblockEnabled", {
            get: () => false,
            set: () => {},
            configurable: true,
          });
        } catch (e) {}
        spoofWorkink();
        return LinkInfoFn ? LinkInfoFn.apply(this, args) : undefined;
      };
    }

    function redirect(url) {
      if (panel) panel.show("backToCheckpoint", "info");
      window.location.href = url;
    }

    function startCountdown(url, waitLeft) {
      if (panel) panel.show("bypassSuccess", "warning");
      let left = parseInt(waitLeft, 10) || 0;
      const iv = setInterval(() => {
        left -= 1;
        if (left > 0) {
          if (panel) panel.show("bypassSuccess", "warning");
        } else {
          clearInterval(iv);
          redirect(url);
        }
      }, 1000);
    }

    function createLinkDestination() {
      return async function (...args) {
        const [data] = args;
        destinationReceived = true;
        destinationURL = data?.url || null;
        if (!destinationProcessed) {
          destinationProcessed = true;
          if (debug) console.log("[Debug] Destination data: ", data);
          // Show UI slider and allow user to start / auto redirect
          if (panel) {
            panel.showCaptchaComplete();
            // set GUI callback to trigger redirect with chosen delay
            panel.setCallback((delay) => {
              // delay is in seconds
              if (!destinationURL) {
                if (debug) console.warn("No destination URL to redirect to");
                return;
              }
              // update global selectedDelay so UI matches
              selectedDelay = parseInt(delay, 10) || 0;
              try {
                localStorage.setItem(STORAGE_KEY_DELAY, String(selectedDelay));
              } catch (_) {}

              // let GUI show countdown and then perform the redirect
              if (panel) {
                panel.startCountdown(selectedDelay);
              }
              setTimeout(() => {
                window.location.href = destinationURL;
              }, selectedDelay * 1000);
            });
          }
        }
        return LinkDestinationFn
          ? LinkDestinationFn.apply(this, args)
          : undefined;
      };
    }

    function setupProxies() {
      const send = getName(sessionController);
      const info = getName(sessionController, map.onLI);
      const dest = getName(sessionController, map.onLD);
      if (!send.fn || !info.fn || !dest.fn) return;
      sendMessage = send.fn;
      LinkInfoFn = info.fn;
      LinkDestinationFn = dest.fn;
      try {
        Object.defineProperty(sessionController, send.name, {
          get: createSendMessage,
          set: (v) => (sendMessage = v),
          configurable: true,
        });
        Object.defineProperty(sessionController, info.name, {
          get: createLinkInfo,
          set: (v) => (LinkInfoFn = v),
          configurable: true,
        });
        Object.defineProperty(sessionController, dest.name, {
          get: createLinkDestination,
          set: (v) => (LinkDestinationFn = v),
          configurable: true,
        });
      } catch (e) {}
    }

    function checkController(target, prop, value) {
      if (
        value &&
        typeof value === "object" &&
        getName(value).fn &&
        getName(value, map.onLI).fn &&
        getName(value, map.onLD).fn &&
        !sessionController
      ) {
        sessionController = value;
        setupProxies();
        if (debug)
          console.log("[Debug] Controller detected:", sessionController);
      }
      return Reflect.set(target, prop, value);
    }

    function createComponentProxy(comp) {
      return new Proxy(comp, {
        construct(target, args) {
          const instance = Reflect.construct(target, args);
          if (instance.$$.ctx) {
            instance.$$.ctx = new Proxy(instance.$$.ctx, {
              set: checkController,
            });
          }
          return instance;
        },
      });
    }

    function createNodeProxy(node) {
      return async (...args) => {
        const result = await node(...args);
        return new Proxy(result, {
          get: (t, p) =>
            p === "component"
              ? createComponentProxy(t.component)
              : Reflect.get(t, p),
        });
      };
    }

    function createKitProxy(kit) {
      if (!kit?.start) return [false, kit];
      return [
        true,
        new Proxy(kit, {
          get(target, prop) {
            if (prop === "start") {
              return function (...args) {
                try {
                  const [nodes, , opts] = args;
                  if (nodes?.nodes && opts?.node_ids) {
                    const idx = opts.node_ids[1];
                    if (nodes.nodes[idx]) {
                      nodes.nodes[idx] = createNodeProxy(nodes.nodes[idx]);
                    }
                  }
                } catch (_) {}
                return kit.start.apply(this, args);
              };
            }
            return Reflect.get(target, prop);
          },
        }),
      ];
    }

    function setupInterception() {
      try {
        const origPromiseAll = unsafeWindow.Promise.all;
        let intercepted = false;
        unsafeWindow.Promise.all = async function (promises) {
          const result = origPromiseAll.call(this, promises);
          if (!intercepted) {
            intercepted = true;
            return await new unsafeWindow.Promise((resolve) => {
              result
                .then(([kit, app, ...args]) => {
                  const [success, created] = createKitProxy(kit);
                  if (success) {
                    unsafeWindow.Promise.all = origPromiseAll;
                  }
                  resolve([created, app, ...args]);
                })
                .catch(() => resolve([kit, app, ...args]));
            });
          }
          return await result;
        };
      } catch (e) {
        if (debug) console.warn("setupInterception failed", e);
      }
    }

    try {
      window.googletag = {
        cmd: [],
        _loaded_: true,
      };
    } catch (_) {}

    const blockedClasses = [
      "adsbygoogle",
      "adsense-wrapper",
      "inline-ad",
      "gpt-billboard-container",
      "[&:not(:first-child)]:mt-12",
      "lg:block",
    ];
    const blockedIds = [
      "billboard-1",
      "billboard-2",
      "billboard-3",
      "sidebar-ad-1",
      "skyscraper-ad-1",
    ];

    setupInterception();

    const ob = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            try {
              blockedClasses.forEach((cls) => {
                if (node.classList?.contains(cls)) {
                  node.remove();
                  if (debug) console.log("[Debug]: Removed ad by class:", cls);
                }
                node.querySelectorAll?.(`.${CSS.escape(cls)}`).forEach((el) => {
                  el.remove();
                  if (debug)
                    console.log("[Debug]: Removed nested ad by class:", cls);
                });
              });
              blockedIds.forEach((id) => {
                if (node.id === id) {
                  node.remove();
                  if (debug) console.log("[Debug]: Removed ad by id:", id);
                }
                node.querySelectorAll?.(`#${CSS.escape(id)}`).forEach((el) => {
                  el.remove();
                  if (debug)
                    console.log("[Debug]: Removed nested ad by id:", id);
                });
              });
            } catch (e) {
              /* ignore CSS.escape errors in old browsers */
            }

            try {
              // detect GTD / big button
              if (
                node.matches &&
                node.matches("button.large") &&
                node.textContent &&
                node.textContent.includes("Go To Destination")
              ) {
                triggerBypass("gtd");
              }
            } catch (_) {}
          }
        }
      }
    });

    ob.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    // Additional observer specifically for Workink "Go to Destination" button
    const gtdObserver = new MutationObserver(() => {
      try {
        const gtdButton = document.querySelector("button.large.accessBtn");
        if (gtdButton && gtdButton.textContent.includes("Go To Destination")) {
          const loader = gtdButton.querySelector(".loader-btn");
          const isDisabled = gtdButton.classList.contains("button-disabled");

          // If button exists without loader showing or not disabled, captcha is solved
          if ((!loader || loader.style.display === "none") && !isDisabled) {
            if (debug)
              console.log(
                "[Debug] Workink captcha solved: Go to Destination button is ready"
              );
            triggerBypass("gtd-ready");
          }
        }
      } catch (e) {
        if (debug) console.error("[Debug] GTD observer error:", e);
      }
    });

    gtdObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  }
})();
