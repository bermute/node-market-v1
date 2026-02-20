(function () {
  const banner = document.getElementById("notification-banner");

  function showBanner(message, duration = 4000) {
    if (!banner) return;
    banner.textContent = message;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), duration);
  }

  window.App = window.App || {};
  window.App.showBanner = showBanner;
})();
