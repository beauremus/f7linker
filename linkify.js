let updateDelayInterval;

browser.storage.local.get("linkifyEnabled").then(response => {
  const enabled = response.linkifyEnabled || true;
  if (enabled) linkify();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (changes.linkifyEnabled && area === "local") {
    linkify();
  }
});

//http://www-ad.fnal.gov/cgi-bin/acl.pl?acl=~kissel/acl/mshow.acl+F:LNM1US+/device_index
//https://www-bd.fnal.gov/cgi-bin/devices.pl/157689.html

let deviceNameRE = new RegExp("[a-z]{1}:\\w{1,12}", "ig");

function parseDeviceIndex(aclOutput) {
  try {
    return aclOutput.match(/Device index = (\d+)\n/i)[1];
  } catch (error) {}

  return false;
}

function getDevicePromise(device) {
  return fetch(
    `/cgi-bin/acl.pl?acl=~kissel/acl/mshow.acl+${device}+/device_index`
  )
    .then(res => res.text())
    .then(parseDeviceIndex);
}

function generateF7Link(deviceIndices) {
  return match => {
    const di = deviceIndices[match];
    return di ? `<a href="/cgi-bin/devices.pl/${di}.html">${match}</a>` : match;
  };
}

function linkify() {
  document.body.querySelectorAll("*").forEach(text => {
    try {
      const devices = text.textContent.match(deviceNameRE);

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
            deviceNameRE,
            generateF7Link(devicesNamesWithIndicies)
          );

          text.innerHTML = newText;
        });
    } catch (error) {}

    return false;
  });
}
