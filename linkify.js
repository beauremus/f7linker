let updateDelayInterval;
const dabblePrefixes = "[LCBDAPTSGIJXZEFRMUV]";
const propSymbols = "[;:_|]";
const deviceRegex = new RegExp(
  `${dabblePrefixes}${propSymbols}\\w{1,12}`,
  "gi"
);

browser.storage.local.get("linkifyEnabled").then(response => {
  if (response.linkifyEnabled === undefined) {
    browser.storage.local.set({ linkifyEnabled: true });
  } else if (response.linkifyEnabled) {
    linkify();
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.linkifyEnabled.newValue) {
      linkify();
    } else {
      delinkify();
    }
  }
});

/**
 * Observer rewrites links that are overwritten by ELog update function
 */
const loadingSpinner = document.querySelector("#loading");

if (loadingSpinner) {
  const observer = new MutationObserver(mutations =>
    mutations.forEach(mutation => {
      if (mutation.oldValue === "display: block;") linkify();
    })
  );

  observer.observe(loadingSpinner, {
    attributeOldValue: true
  });
}

function parseDeviceIndex(aclOutput) {
  try {
    return aclOutput.match(/Device index = (\d+)\n/i)[1];
  } catch (error) {}

  return false;
}

/**
 * Reference URLs
 * Web ACL for getting device_index
 * http://www-ad.fnal.gov/cgi-bin/acl.pl?acl=~kissel/acl/mshow.acl+F:LNM1US+/device_index
 * F7 help URL format
 * https://www-bd.fnal.gov/cgi-bin/devices.pl/157689.html
 */

function getDevicePromise(device) {
  return fetch(
    `https://www-bd.fnal.gov/cgi-bin/acl.pl?acl=~kissel/acl/mshow.acl+${device}+/device_index`
  )
    .then(res => res.text())
    .then(text => {
      return text;
    })
    .then(parseDeviceIndex);
}

function generateF7Link(deviceIndices) {
  return (fullMatch, group1, group2, group3) => {
    const di = deviceIndices[group2];
    return di
      ? `${group1}<a href="https://www-bd.fnal.gov/cgi-bin/devices.pl/${di}.html" class="f7linked">${group2}</a>${group3}`
      : fullMatch;
  };
}

/**
 * listenerReference must be held to refer to in remove listener
 */

let listenerReference = {};

function f7Listener(deviceName) {
  const fire = function(event) {
    if (event.key !== "F7") return;
    event.preventDefault();
    getDevicePromise(deviceName).then(di => {
      window.open(`https://www-bd.fnal.gov/cgi-bin/devices.pl/${di}.html`);
    });
  };

  document.body.addEventListener("keypress", fire);
  listenerReference[deviceName] = fire;
}

function mouseListeners(element) {
  /**
   * If mouse events aren't added and removed
   * all eventListeners are triggered on keypress
   */
  element.addEventListener("mouseenter", event => {
    f7Listener(event.target.textContent);
  });
  element.addEventListener("mouseleave", event => {
    document.body.removeEventListener(
      "keypress",
      listenerReference[event.target.textContent]
    );
  });
}

function semicolonCorrection(device) {
  return device.replace(";", ":");
}

function injectF7Links(element) {
  try {
    /**
     * Example of RegExp https://regex101.com/r/MQ7lNe/3/
     */
    let devicesRegExp = new RegExp(
      `((?:<[^>]*>|[.,\\s])*)(${dabblePrefixes}${propSymbols}\\w{1,12})((?:<[^>]*>|[.,\\s])*)`,
      "gi"
    );
    let devices = [];
    let matches;
    let hasLinkedDevice = false;

    while ((matches = devicesRegExp.exec(element.innerHTML)) !== null) {
      /**
       * "</a>" in the fourth index indicates that
       * the device name is inside a link tag
       */
      if (matches[3] !== "</a>") {
        devices.push(matches[2]);
      } else {
        hasLinkedDevice = true;
      }
    }

    const diPromises = devices
      .map(semicolonCorrection)
      .map(device => {
        return device;
      })
      .map(getDevicePromise);

    Promise.all(diPromises)
      .then(deviceDIs => {
        let devicesWithIndices = {};

        deviceDIs.forEach((deviceDI, index) => {
          devicesWithIndices[devices[index]] = deviceDI;
        });

        return devicesWithIndices;
      })
      .then(devicesNamesWithIndices => {
        element.innerHTML = element.innerHTML.replace(
          devicesRegExp,
          generateF7Link(devicesNamesWithIndices)
        );

        element.querySelectorAll(".f7linked").forEach(link => {
          mouseListeners(link);
        });

        if (hasLinkedDevice) {
          element.querySelectorAll("a").forEach(link => {
            if (link.textContent.match(deviceRegex)) {
              mouseListeners(link);
            }
          });
        }
      });
  } catch (error) {
    console.error(error);
  }

  return false;
}

function linkify() {
  const selectors = {
    elog: ".text",
    deviceHelp: "pre"
  };

  for (const selector in selectors) {
    document.body.querySelectorAll(selectors[selector]).forEach(injectF7Links);
  }
}

function delinkify() {
  document.querySelectorAll(".f7linked").forEach(link => {
    link.replaceWith(link.textContent);
  });
}
