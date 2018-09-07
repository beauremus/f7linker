// TODO: monitor DOM change and linkify()

let updateDelayInterval;

browser.storage.local.get("linkifyEnabled").then(response => {
  const enabled = response.linkifyEnabled;
  if (enabled) linkify();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.linkifyEnabled) {
      linkify();
    } else {
      // TODO: delinkify();
    }
  }
});

//http://www-ad.fnal.gov/cgi-bin/acl.pl?acl=~kissel/acl/mshow.acl+F:LNM1US+/device_index
//https://www-bd.fnal.gov/cgi-bin/devices.pl/157689.html

let devicesRegExp = new RegExp("[a-z]{1}:\\w{1,12}(?!\\w)", "ig");

function parseDeviceIndex(aclOutput) {
  try {
    return aclOutput.match(/Device index = (\d+)\n/i)[1];
  } catch (error) {}

  return false;
}

function getDevicePromise(device) {
  return fetch(
    `https://www-bd.fnal.gov/cgi-bin/acl.pl?acl=~kissel/acl/mshow.acl+${device}+/device_index`
  )
    .then(res => res.text())
    .then(parseDeviceIndex);
}

function generateF7Link(deviceIndices) {
  return match => {
    const di = deviceIndices[match];
    return di
      ? `<a href="https://www-bd.fnal.gov/cgi-bin/devices.pl/${di}.html" class="f7linked">${match}</a>`
      : match;
  };
}

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

function linkify() {
  document.body.querySelectorAll("*").forEach(text => {
    try {
      // Ensure that this is the youngest child
      if (text.childElementCount !== 0) return;

      const devices = text.innerText.match(devicesRegExp);

      if (text.tagName === "A") {
        if (devices) {
          mouseListeners(text);
        }

        return;
      }

      const diPromises = devices.map(getDevicePromise);

      Promise.all(diPromises)
        .then(deviceDIs => {
          let devicesWithIndicies = {};

          deviceDIs.forEach((deviceDI, index) => {
            devicesWithIndicies[devices[index]] = deviceDI;
          });

          return devicesWithIndicies;
        })
        .then(devicesNamesWithIndicies => {
          const newText = text.innerHTML.replace(
            devicesRegExp,
            generateF7Link(devicesNamesWithIndicies)
          );

          text.innerHTML = newText;

          for (child of text.children) {
            mouseListeners(child);
          }
        });
    } catch (error) {}

    return false;
  });
}
