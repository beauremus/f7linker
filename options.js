function saveOptions(event) {
  browser.storage.local.set({
    linkifyEnabled: document.querySelector("#linkifyEnabled").checked
  });
  event.preventDefault();
}

function restoreOptions() {
  const localItem = browser.storage.local.get("linkifyEnabled");
  localItem.then(res => {
    let enabled = res.linkifyEnabled;

    if (enabled === undefined) {
      browser.storage.local.set({ linkifyEnabled: true });
      enabled = true;
    }

    document.querySelector("#linkifyEnabled").checked = enabled;
  });
}

browser.storage.onChanged.addListener((changes, area) => {
  if (changes.linkifyEnabled && area === "local") {
    document.querySelector("#linkifyEnabled").checked =
      changes.linkifyEnabled.newValue;
  }
});

document.addEventListener("DOMContentLoaded", restoreOptions);

document
  .querySelector("#linkifyEnabled")
  .addEventListener("change", saveOptions);
