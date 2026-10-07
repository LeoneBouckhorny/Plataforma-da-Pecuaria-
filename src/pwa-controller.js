(function () {
  const installButton = document.querySelector("#install-app");
  const connectionStatus = document.querySelector("#connection-status");
  let deferredInstallPrompt = null;
  let onlineMessageTimer = null;

  function isStandalone() {
    return Boolean(
      window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true,
    );
  }

  function setInstallVisible(visible) {
    if (!installButton) return;
    installButton.classList.toggle("hidden", !visible);
    installButton.disabled = false;
  }

  function updateInstallButton() {
    setInstallVisible(Boolean(deferredInstallPrompt) && !isStandalone());
  }

  function setConnectionMessage(message, status) {
    if (!connectionStatus) return;

    connectionStatus.textContent = message || "";
    connectionStatus.className = `connection-status ${status || ""}`.trim();
    connectionStatus.classList.toggle("hidden", !message);
  }

  function updateConnectionStatus(showOnlineMessage = false) {
    window.clearTimeout(onlineMessageTimer);

    if (!navigator.onLine) {
      setConnectionMessage("Sem conexão — seus dados locais continuam disponíveis.", "offline");
      return;
    }

    if (showOnlineMessage) {
      setConnectionMessage("Rede disponível.", "online");
      onlineMessageTimer = window.setTimeout(() => setConnectionMessage("", ""), 2600);
      return;
    }

    setConnectionMessage("", "");
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    } catch (_error) {
      setConnectionMessage("", "");
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallButton();
  });

  window.addEventListener("online", () => updateConnectionStatus(true));
  window.addEventListener("offline", () => updateConnectionStatus(false));

  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        updateInstallButton();
        return;
      }

      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      installButton.disabled = true;

      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
      } catch (_error) {
        // Install support varies by browser; refusal or failure must not affect the app.
      } finally {
        updateInstallButton();
      }
    });
  }

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  if (typeof standaloneQuery.addEventListener === "function") {
    standaloneQuery.addEventListener("change", updateInstallButton);
  }

  updateInstallButton();
  updateConnectionStatus(false);

  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", registerServiceWorker, { once: true });
  }
})();
