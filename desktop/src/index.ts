import { app, BrowserWindow, dialog, session } from 'electron';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const RENDERER_HOST = 'localhost';
const RENDERER_PORT = 5173;
const DEVELOPMENT_URL = `http://${RENDERER_HOST}:${RENDERER_PORT}`;

type BluetoothDeviceOption = {
	deviceId: string;
	deviceName: string;
};

app.commandLine.appendSwitch('enable-web-bluetooth');

function isTrustedOrigin(origin: string): boolean {
	return origin === DEVELOPMENT_URL;
}

function installBluetoothPicker(window: BrowserWindow): void {
	let availableDevices: BluetoothDeviceOption[] = [];
	let selectDevice: ((deviceId: string) => void) | null = null;
	let selectionTimer: NodeJS.Timeout | undefined;
	let pickerOpen = false;

	window.webContents.on('select-bluetooth-device', (event, devices, callback) => {
		event.preventDefault();
		availableDevices = devices;
		selectDevice = callback;

		if (selectionTimer) clearTimeout(selectionTimer);
		selectionTimer = setTimeout(() => {
			selectionTimer = undefined;
			void showDevicePicker();
		}, 700);
	});

	async function showDevicePicker(): Promise<void> {
		if (pickerOpen || !selectDevice || availableDevices.length === 0) return;
		pickerOpen = true;
		const devices = [...availableDevices];
		const callback = selectDevice;

		try {
			if (devices.length === 1) {
				callback(devices[0]!.deviceId);
				return;
			}

			const labels = devices.map(
				(device, index) => device.deviceName.trim() || `Bluetooth printer ${index + 1}`,
			);
			const cancelIndex = labels.length;
			const { response } = await dialog.showMessageBox(window, {
				type: 'question',
				title: 'Choose Bluetooth printer',
				message: 'Select the receipt printer to connect. Make sure it is powered on.',
				buttons: [...labels, 'Cancel'],
				cancelId: cancelIndex,
				defaultId: 0,
				noLink: true,
			});

			callback(devices[response]?.deviceId ?? '');
		} catch (error) {
			console.error('Bluetooth device selection failed:', error);
			callback('');
		} finally {
			availableDevices = [];
			selectDevice = null;
			pickerOpen = false;
		}
	}
}

function contentTypeFor(filePath: string): string {
	switch (extname(filePath).toLowerCase()) {
		case '.css':
			return 'text/css; charset=utf-8';
		case '.html':
			return 'text/html; charset=utf-8';
		case '.ico':
			return 'image/x-icon';
		case '.js':
			return 'text/javascript; charset=utf-8';
		case '.json':
			return 'application/json; charset=utf-8';
		case '.png':
			return 'image/png';
		case '.svg':
			return 'image/svg+xml';
		case '.webp':
			return 'image/webp';
		case '.woff2':
			return 'font/woff2';
		default:
			return 'application/octet-stream';
	}
}

function startProductionRenderer(): Promise<Server> {
	const rendererRoot = resolve(app.getAppPath(), 'frontend', 'dist');
	const indexPath = resolve(rendererRoot, 'index.html');
	if (!existsSync(indexPath)) {
		throw new Error(`Built POS frontend was not found at ${indexPath}`);
	}

	const server = createServer((request, response) => {
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			response.writeHead(405).end();
			return;
		}

		let requestPath: string;
		try {
			requestPath = decodeURIComponent(new URL(request.url ?? '/', DEVELOPMENT_URL).pathname);
		} catch {
			response.writeHead(400).end();
			return;
		}

		const requestedFile = resolve(rendererRoot, `.${requestPath}`);
		if (requestedFile !== rendererRoot && !requestedFile.startsWith(`${rendererRoot}${sep}`)) {
			response.writeHead(403).end();
			return;
		}

		const filePath = existsSync(requestedFile) && statSync(requestedFile).isFile()
			? requestedFile
			: indexPath;
		response.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
		if (request.method === 'HEAD') {
			response.end();
			return;
		}
		createReadStream(filePath).pipe(response);
	});

	return new Promise((resolveServer, reject) => {
		server.once('error', reject);
		server.listen(RENDERER_PORT, RENDERER_HOST, () => resolveServer(server));
	});
}

function createMainWindow(): BrowserWindow {
	const window = new BrowserWindow({
		width: 1440,
		height: 960,
		minWidth: 1024,
		minHeight: 700,
		show: false,
		autoHideMenuBar: true,
		title: 'Dream Makeover POS',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	installBluetoothPicker(window);
	window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
	window.webContents.on('will-navigate', (event, url) => {
		if (new URL(url).origin !== DEVELOPMENT_URL) event.preventDefault();
	});
	window.once('ready-to-show', () => window.show());

	void window.loadURL(DEVELOPMENT_URL);
	return window;
}

let rendererServer: Server | undefined;

void app.whenReady().then(async () => {
	session.defaultSession.setPermissionCheckHandler((_webContents, permission, origin) => {
		return (permission as string) === 'bluetooth' && isTrustedOrigin(origin);
	});
	session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
		callback(
			(permission as string) === 'bluetooth' &&
				isTrustedOrigin(webContents?.getURL().split('/').slice(0, 3).join('/') ?? ''),
		);
	});

	if (app.isPackaged) rendererServer = await startProductionRenderer();
	createMainWindow();
}).catch((error: unknown) => {
	const message = error instanceof Error ? error.message : 'Unable to start the desktop app.';
	console.error(error);
	dialog.showErrorBox('Dream Makeover POS', message);
	app.quit();
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('window-all-closed', () => {
	rendererServer?.close();
	if (process.platform !== 'darwin') app.quit();
});
