const { contextBridge, ipcRenderer } = require("electron");

// Electron wraps a main-process error as "Error invoking remote method 'x':
// Error: …", and the Sync section shows a sync's message as it comes.
const invokeClean = (channel, ...args) =>
  ipcRenderer.invoke(channel, ...args).catch((error) => {
    throw new Error(
      String(error?.message ?? error).replace(
        /^Error invoking remote method '[^']*': (?:Error: )?/,
        "",
      ),
    );
  });

// runtime.web.ts runs extensions through the sidecar, anilist.ts signs in.
contextBridge.exposeInMainWorld("anipoex", {
  runtime: (method, args) => ipcRenderer.invoke("runtime", method, args),
  signIn: (url) => ipcRenderer.invoke("sign-in", url),
  scanProgress: (fraction) => ipcRenderer.send("scan-progress", fraction),
  github: (url, body) => invokeClean("github", url, body),
  folder: (method, dir, arg) => invokeClean("folder", method, dir, arg),
  downloads: (method, root, ...args) =>
    invokeClean("downloads", method, root, ...args),
  installUpdate: (url, onProgress) => {
    const listener = (_event, fraction) => onProgress(fraction);
    ipcRenderer.on("update-progress", listener);
    return invokeClean("install-update", url).finally(() =>
      ipcRenderer.off("update-progress", listener),
    );
  },
  onFolderChange: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("folder-changed", listener);
    return () => ipcRenderer.off("folder-changed", listener);
  },
});
