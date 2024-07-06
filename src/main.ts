import { app, BrowserWindow, Menu, shell } from 'electron';
import express from 'express';
import path from 'path';
import * as p from 'prse';
const { prse, string, number, boolean, unknown, array, object, objectLoose, set, map, record, tuple, fail, date, instance, func, uint8Array, int8Array, bigInt, symbol, regexp } = p;
const server = express();
const isMac: boolean = process.platform === 'darwin';
let serverSavedData = null;
let axoget = {};

// Utility functions

function calculateStringSize(string) {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(string).length;
	return bytes;
}

function stringSizeUnit(bytes) {
	if (bytes >= 1000 * 1000 * 1000) {
		return `${(bytes / (1000 * 1000 * 1000)).toFixed(2)}GB`;
	} else if (bytes >= 1000 * 1000) {
		return `${(bytes / (1000 * 1000)).toFixed(2)}MB`;
	} else if (bytes >= 1000) {
		return `${(bytes / 1000).toFixed(2)}KB`;
	} else {
		return `${bytes}B`;
	}
}

function formatTime(duration: number): string {
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

function generateCode(address: string, headers: string, body: string | null, options: string = '', method: string = 'GET', preScript: string = ''): string {
	if (method === 'GET' || method === 'HEAD') {
		body = null;
	} else if (body != null) {
		body = JSON.stringify(body);
		body = JSON.parse(body.replace(/ /g, '').endsWith(',}"') ? body.slice(0, -3) + '}"' : body);
		body = `JSON.stringify(${body})`;
	}

	return `
${preScript}

fetch(\`${address}\`, {
    method: '${method}',
    ${options}
    headers: ${headers},
    body: ${body}
});
`;
}

// Server

server.set('views', path.join(__dirname, 'views'));
server.use(express.static(__dirname + '/static'));
server.use(express.json());
server.use(express.json({ limit: '5000mb' }));
server.use(express.urlencoded({ extended: true, limit: '5000mb' }));
server.use((_, res, next): void => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
});

server.get('/', async (_, res) => {
	try {
		res.sendFile(path.join(__dirname, 'views', 'home.html'));
	} catch (error) {
		console.error('Error rendering HTML file:', error);
		res.status(500).send('Internal Server Error');
	}
});

server.get('/axoget', async (_, res) => {
	res.sendFile(path.join(__dirname, 'views', 'axoget.html'));
});

server.post('/fetch', async (req, res) => {
	const { code } = req.query;
	const { address, headers, body, options, method, preScript, postScript } = req.body;

	if (code === 'true') {
		return res.json({
			codeFromaxoget: true,
			code: generateCode(address, headers, body, options, method, preScript)
		});
	}

	try {
		const startTime = performance.now();
		const response = await eval(generateCode(address, headers, body, options, method, preScript));
		const time = formatTime(performance.now() - startTime);
		const data = await response.text();

		// const x = JSON.parse(JSON.parse(JSON.stringify(data, null, 2)));
		// const f = objectLoose({
		// 	id: number(),
		// 	compeleted: boolean()
		// });

		// prse(f, x, () => {
		// 	console.log('success')
		// }, (e) => {
		// 	console.log('error', e)
		// })

		if (!(postScript.replace(/\s/g, '') === '')) {
			eval(postScript);
		}

		let headersString = '';

		const d = {
			status: response.status,
			statusText: response.statusText,
			headers: {}
		};

		response.headers.forEach((value, key) => {
			d.headers[key] = value;
			headersString += key + value;
		});

		// console.log(response.headers.get('set-cookie'));

		const headersSize = calculateStringSize(headersString);
		const bodySize = calculateStringSize(data);

		res.json({
			result: data,
			time,
			size: stringSizeUnit(headersSize + bodySize),
			headersSize: stringSizeUnit(headersSize),
			bodySize: stringSizeUnit(bodySize),
			status: d.status,
			headers: d.headers,
			headersCount: Object.keys(d.headers).length
		});
	} catch (error) {
		console.log(error);
		res.json({
			result: JSON.stringify({
				error: true,
				errorFromaxoget: true,
				message: String(error)
			})
		});
	}
});

server.get('/delay-test', (_, res) => {
	setTimeout(() => {
		res.send('This message was sent after a 5 second delay!');
	}, 5000);
});

server.post('/body-test', (req, res) => {
	const { message } = req.body;
	res.json({
		success: true,
		d: message
	});
});

server.post('/save-data', (req, res) => {
	serverSavedData = req.body;
	serverSavedData['none'] = false;
	res.json({
		success: true
	});
});

server.get('/get-saved-data', (_, res) => {
	if (serverSavedData == null) {
		res.json({ none: true });
	} else {
		res.json(serverSavedData);
	}
	serverSavedData = null;
});

const serverPort = server.listen(0, (): void => {
	console.log(`Server is running on port http://localhost:${serverPort.address().port}`);
});

// App

const PORT = 'http://localhost:' + serverPort.address().port;
let mainWindow;
let splash;

app.disableHardwareAcceleration();

function createWindow(): void {
	mainWindow = new BrowserWindow({
		title: 'axoget',
		width: 1200,
		height: 700,
		minWidth: 300,
		minHeight: 200,
		show: false,
		icon: __dirname + '/static/axoget.ico',
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			devTools: true
		}
	});

	splash = new BrowserWindow({
		width: 500,
		height: 500,
		transparent: true,
		frame: false,
		icon: __dirname + '/static/axoget.ico'
	});
	splash.loadURL(`${PORT}/axoget`);
	mainWindow.loadURL(PORT);

	mainWindow.once('ready-to-show', () => {
		splash.destroy();
		mainWindow.show();
	});

	mainWindow.on('closed', function () {
		mainWindow = null;
	});
}

app.whenReady().then((): void => {
	createWindow();

	const menuTemplate: Record<string, any>[] = [
		{
			label: 'axoget',
			submenu: [
				{
					label: 'GitHub',
					click: () => {
						shell.openExternal('https://github.com/Axorax');
					}
				},
				{
					label: 'Socials',
					click: () => {
						shell.openExternal('https://github.com/Axorax/socials');
					}
				},
				{
					label: 'Open Developer Tools',
					accelerator: 'Ctrl+Shift+I',
					click: () => {
						const focusedWindow = BrowserWindow.getFocusedWindow();
						if (focusedWindow) {
							focusedWindow.webContents.openDevTools();
						}
					}
				},
				{
					label: `Hosted on ${PORT}`,
					click: () => {
						shell.openExternal(`http://localhost:${PORT}`);
					}
				}
			]
		},
		{
			label: 'Examples',
			submenu: [
				{
					label: 'JSONplaceholder API GET',
					click: () => {
						if (mainWindow) {
							mainWindow.webContents.send('example', 'j-get');
						}
					}
				},
				{
					label: 'Restful API POST',
					click: () => {
						if (mainWindow) {
							mainWindow.webContents.send('example', 'r-post');
						}
					}
				},
				{
					label: 'Delay test',
					click: () => {
						if (mainWindow) {
							mainWindow.webContents.send('example', 'delay', PORT);
						}
					}
				},
				{
					label: 'Body test',
					click: () => {
						if (mainWindow) {
							mainWindow.webContents.send('example', 'body', PORT);
						}
					}
				}
			]
		},
		{
			label: 'Donate',
			click: () => {
				shell.openExternal('https://www.patreon.com/axorax');
			}
		},
		{
			label: 'Exit',
			accelerator: isMac ? 'Cmd+Q' : 'Ctrl+Q',
			click: () => {
				app.quit();
			}
		}
	];

	const mainMenu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(mainMenu);

	if (mainWindow) {
		mainWindow.webContents.on('new-window', (event, url): void => {
			event.preventDefault();

			const newWindow = new BrowserWindow({
				title: 'axoget',
				width: 1200,
				height: 700,
				icon: path.join(__dirname, 'static/axoget.ico'),
				webPreferences: {
					nodeIntegration: true,
					contextIsolation: false,
					devTools: true
				}
			});

			newWindow.loadURL(url);
		});

		mainWindow.on('closed', (): void => {
			mainWindow = null;
		});

		app.on('window-all-closed', (): void => {
			if (!isMac) {
				app.quit();
			}
		});

		app.on('activate', (): void => {
			if (BrowserWindow.getAllWindows().length === 0) {
				createWindow();
			}
		});
	}
});
