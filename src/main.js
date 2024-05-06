const { app, BrowserWindow, Menu, shell } = require("electron");
const express = require("express");
const path = require("path");
const server = express();
const isMac = process.platform === "darwin";

// Utility functions

function calculateStringSize(string) {
  const encoder = new TextEncoder();
  const encodedString = encoder.encode(string);
  const sizeInBytes = encodedString.length;

  if (sizeInBytes >= 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } else if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (sizeInBytes >= 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${sizeInBytes} bytes`;
  }
}

function formatTime(duration) {
  if (duration < 1000) {
    return `${Math.round(duration)}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(2)}s`;
  } else if (duration < 3600000) {
    return `${(duration / 60000).toFixed(2)}m`;
  } else if (duration < 86400000) {
    return `${(duration / 3600000).toFixed(2)}h`;
  } else {
    return `${(duration / 86400000).toFixed(2)}d`;
  }
}

function generateCode(address, headers, body, options, method) {
  return `
  fetch('${address}', {
      method: '${method}',
      ${options != undefined ? options : ""}
      ${
        method != "GET"
          ? `headers: ${headers},
      body: ${body},`
          : ""
      }

  })
`;
}

// Server

server.set("views", path.join(__dirname, "views"));
server.use(express.static(__dirname + "/static"));
server.use(express.json());
server.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

server.get("/", async (_, res) => {
  try {
    res.sendFile(path.join(__dirname, "views", "home.html"));
  } catch (error) {
    console.error("Error rendering HTML file:", error);
    res.status(500).send("Internal Server Error");
  }
});

server.post("/fetch", async (req, res) => {
  const { code } = req.query;
  const { address, headers, body, options, method } = req.body;

  if (code === "true") {
    return res.json({
      codeFromFetcharoni: true,
      code: generateCode(address, headers, body, options, method),
    });
  }

  try {
    const startTime = performance.now();

    const dynamicCode = generateCode(address, headers, body, options, method);

    const response = await eval(dynamicCode);
    const time = formatTime(performance.now() - startTime);
    const result = await response.text();

    const data = {
      status: response.status,
      statusText: response.statusText,
      headers: {},
    };

    response.headers.forEach((value, key) => {
      data.headers[key] = value;
    });

    res.json({
      result: result,
      time,
      size: calculateStringSize(result),
      status: data.status,
      headers: data.headers,
    });
  } catch (error) {
    res.json({
      result: JSON.stringify({
        error: true,
        errorFromFetcharoni: true,
        message: String(error),
      }),
    });
  }
});

server.get("/delay-test", (_, res) => {
  setTimeout(() => {
    res.send("This message was sent after a 5 second delay!");
  }, 5000);
});

const serverPort = server.listen(0, () => {
  console.log(
    `Server is running on port http://localhost:${serverPort.address().port}`,
  );
});

// App

const PORT = "http://localhost:" + serverPort.address().port;
let mainWindow;

app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Fetcharoni",
    width: 1200,
    height: 700,
    icon: __dirname + "/static/fetcharoni.ico",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
    },
  });

  mainWindow.loadURL(PORT);
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  const menuTemplate = [
    {
      label: "Fetcharoni",
      submenu: [
        {
          label: "GitHub",
          click: () => {
            shell.openExternal("https://github.com/Axorax");
          },
        },
        {
          label: "Socials",
          click: () => {
            shell.openExternal("https://github.com/Axorax/socials");
          },
        },
        {
          label: "Open Developer Tools",
          accelerator: "Ctrl+Shift+I",
          click: () => {
            BrowserWindow.getFocusedWindow().webContents.openDevTools();
          },
        },
        {
          label: "Hosted on " + PORT,
          click: () => {
            shell.openExternal(PORT);
          },
        },
      ],
    },
    {
      label: "Examples",
      submenu: [
        {
          label: "JSONplaceholder API",
          click: () => {
            mainWindow.webContents.send("example", "try");
          },
        },
        {
          label: "Delay test",
          click: () => {
            mainWindow.webContents.send("example", "delay", PORT);
          },
        },
      ],
    },
    {
      label: "Donate",
      click: () => {
        shell.openExternal("https://www.patreon.com/axorax");
      },
    },
    {
      label: "Exit",
      accelerator: isMac ? "Cmd+Q" : "Ctrl+Q",
      click: () => {
        app.quit();
      },
    },
  ];

  const mainMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(mainMenu);

  mainWindow.webContents.on("new-window", (event, url) => {
    event.preventDefault();

    const newWindow = new BrowserWindow({
      title: "Fetcharoni",
      width: 1200,
      height: 700,
      icon: __dirname + "/static/fetcharoni.ico",
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: true,
      },
    });

    newWindow.loadURL(url);
  });

  mainWindow.on("closed", () => (mainWindow = null));

  app.on("resize", function (e, x, y) {
    mainWindow.setSize(x, y);
  });

  app.on("window-all-closed", () => {
    if (!isMac) {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
