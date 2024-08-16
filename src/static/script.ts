import { ipcRenderer } from 'electron';

// Selectors

const s = {
	sidebar: document.querySelector<HTMLElement>('#sidebar'),
	main: document.querySelector<HTMLElement>('main'),
	address: document.querySelector('#info .input-wrapper input') as HTMLInputElement,
	headers: document.querySelector('#tab-headers #subtab-headers-JSON .input-1') as HTMLElement,
	body: document.querySelector('#tab-body .input-1') as HTMLElement,
	options: document.querySelector('#tab-options .input-1') as HTMLElement,
	dropdown: {
		button: document.querySelectorAll('.dropdown') as unknown as HTMLButtonElement,
		content: document.querySelectorAll('.dropdown-content') as unknown as HTMLUListElement
	},
	tabs: {
		body: document.querySelector('#tab-body')
	}
};

// Variables

let method: string = 'GET';
let contentType: string = 'Application/JSON';
let resData = null;
let importType: string | null = null;

// Load data if saved in server

fetch('/get-saved-data', { method: 'GET' })
	.then((r) => r.json())
	.then((d) => {
		if (d.none == true) return;
		parseaxgFile(d);
	});

// IPC Renderer

ipcRenderer.on('example', (e, t, ...params) => {
	if (t == 'j-get') {
		s.address.value = 'https://jsonplaceholder.typicode.com/todos/1';
		setMethod('GET');
	} else if (t == 'delay') {
		s.address.value = params[0] + '/delay-test';
		setMethod('GET');
	} else if (t == 'body') {
		s.address.value = params[0] + '/body-test';
		setMethod('POST');
		s.body.innerHTML = `"message": "axoget POST test",`;
	} else if (t == 'r-post') {
		s.address.value = 'https://api.restful-api.dev/objects';
		s.body.innerHTML = `"name": "axoget POST test",\n<div>"data": {"Project": "axoget","Timestamp":"awd"}</div>`;
		setMethod('POST');
	}
	sendRequest();
	setInputSize();
});

// Set tab and subtab

function setTab(id: string, current: HTMLElement) {
	[...current.parentElement.children].forEach((e) => e.classList.remove('active'));
	current.classList.add('active');

	const element = document.querySelector(`#tab-${id}`) as HTMLElement | null;
	[...element.parentElement.children].forEach((e) => e.classList.remove('active'));
	element.classList.add('active');
}

function setSubtab(id: string, current: HTMLElement, noParent: boolean = false) {
	if (!noParent) {
		[...current.parentElement.children].forEach((el) => el.classList.remove('active'));
		current.classList.add('active');
	}

	const element = document.querySelector(`#subtab-${id}`);
	[...element.parentElement.children].forEach((el) => el.classList.remove('active'));
	element.classList.add('active');
	deactivateDropdowns();
}

// Set import and export

function setImport(type: string | null) {
	const buttons = document.querySelector('#subtab-import > .buttons') as HTMLElement;
	const input = document.querySelector('.import-input') as HTMLElement;

	(document.querySelector('.import-input .input-4') as HTMLElement).innerText = '';

	if (type === null) {
		buttons.style.display = 'block';
		input.style.display = 'none';
		return;
	}

	buttons.style.display = 'none';
	input.style.display = 'block';
	importType = type.toLowerCase();
}

const exportTypes = {
	axg: (d) => {
		return JSON.stringify(d, null, 4);
	},
	jsws: (_) => {
		fetch('/fetch?code=true', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(getData())
		})
			.then((res) => res.json())
			.then((response: { code: string }) => {
				document.querySelector<HTMLElement>('#subtab-export .export .code').innerText = response.code;
			});
	}
};

async function setExport(type: string | null) {
	const codeBox = document.querySelector('#subtab-export .code') as HTMLElement;
	const buttons = document.querySelector('#subtab-export .buttons') as HTMLElement;
	const output = document.querySelector('#subtab-export .export-output') as HTMLElement;

	codeBox.innerHTML = '';

	if (type === null) {
		buttons.style.display = 'block';
		output.style.display = 'none';
		return;
	}

	buttons.style.display = 'none';
	output.style.display = 'block';
	const x = await exportTypes[type](createJsonForData());
	codeBox.innerText = x;
}

// Dropdown

for (let i = 0; i < (s.dropdown.button as any).length; i++) {
	s.dropdown.button[i].addEventListener('click', () => {
		const x = s.dropdown.content[i];
		const b = s.dropdown.button[i].getBoundingClientRect();

		document.querySelectorAll('.dropdown-content.active').forEach((e) => {
			if (e != x) {
				e.classList.remove('active');
			}
		});

		if (x.classList.contains('active')) {
			x.classList.remove('active');
		} else {
			x.classList.add('active');
			x.style = `top: ${b.top + b.height};left: ${b.left};max-height: ${document.body.clientHeight - 3 * (b.top + b.height + window.scrollY)};`;
		}
	});
}

// Deactivate all dropdowns

function deactivateDropdowns() {
	document.querySelectorAll('.dropdown-content.active').forEach((e) => {
		e.classList.remove('active');
	});
}

// Set method

function setMethod(t: string) {
	if (t === 'GET' || t === 'HEAD') {
		s.tabs.body.classList.add('hide');
	} else {
		s.tabs.body.classList.remove('hide');
	}
	method = t;
	document.querySelector<HTMLElement>('.dropdown.method p:first-child').innerText = t;
	deactivateDropdowns();
}

// Set content-type

function setContentType(t: string) {
	if (t == 'text' || t == 'html') {
		contentType = 'text/' + t;
	} else {
		contentType = 'Application/' + t;
	}
	document.querySelector<HTMLElement>('.dropdown.contentType button > p:first-child').innerText = t;
	deactivateDropdowns();
}

// Toggle sidebar

function toggleSidebar() {
	if (s.sidebar.classList.contains('active')) {
		s.sidebar.classList.remove('active');
		s.main.classList.remove('active');
	} else {
		s.sidebar.classList.add('active');
		s.main.classList.add('active');
	}
}

// Import axoget file from file explorer

document.getElementById('import-axg-input')!.addEventListener('change', function (this: HTMLInputElement) {
	const file = this.files![0];
	if (file) {
		const extension = file.name.split('.').pop();
		if (extension === 'axg') {
			const reader = new FileReader();

			reader.onload = function (event) {
				if (event.target) {
					const target = event.target as FileReader;
					parseaxgFile(JSON.parse(target.result as string));
				}
			};

			reader.readAsText(file);
		} else {
			alert('Please select a ".axg" file.');
		}
	}
});

// Parse axoget file

function parseaxgFile(data: any = { address: '', method: 'GET' }): void {
	s.address.value = data.address;
	setMethod(data.method);
	s.headers.innerHTML = '';
	s.body.innerHTML = '';
	s.options.innerHTML = '';
	if ('headers' in data) {
		const k1 = Object.keys(data.headers);
		for (let i = 0; i < k1.length; i++) {
			if (i == 0) {
				s.headers.innerHTML += `"${k1[i]}": "${data.headers[k1[i]]}",`;
			} else {
				s.headers.innerHTML += `<div>"${k1[i]}": "${data.headers[k1[i]]}",</div>`;
			}
		}
	}
	if ('body' in data) {
		const k2 = Object.keys(data.body);
		for (let i = 0; i < k2.length; i++) {
			if (i == 0) {
				s.body.innerHTML += `"${k2[i]}": "${data.body[k2[i]]}",`;
			} else {
				s.body.innerHTML += `<div>"${k2[i]}": "${data.body[k2[i]]}",</div>`;
			}
		}
	}
	if ('options' in data) {
		const k3 = Object.keys(data.options);
		for (let i = 0; i < k3.length; i++) {
			if (i == 0) {
				s.options.innerHTML += `"${k3[i]}": "${data.options[k3[i]]}",`;
			} else {
				s.options.innerHTML += `<div>"${k3[i]}": "${data.options[k3[i]]}",</div>`;
			}
		}
	}
	if ('headersStr' in data) {
		s.headers.innerHTML = data.headersStr;
	}
	if ('bodyStr' in data) {
		s.body.innerHTML = data.bodyStr;
	}
	if ('optionsStr' in data) {
		s.options.innerHTML = data.optionsStr;
	}
	if ('preScript' in data) {
		(document.querySelector('#pre-request-input') as HTMLElement).innerText = JSON.parse(data.preScript);
	}
	if ('postScript' in data) {
		(document.querySelector('#post-request-input') as HTMLElement).innerText = JSON.parse(data.postScript);
	}
}

// Import parsers

const importParsers = {
	curl: function (cmd) {
		var r = { headers: {}, body: {}, address: '', method: 'GET', options: {} };
		var urlMatch = cmd.match(/curl\s+['"]?([^"'\s]+)['"]?/);
		if (urlMatch) r.address = urlMatch[1];
		var headerMatches = cmd.match(/-H\s+['"]([^:]+):\s?([^"']+)['"]/g);
		if (headerMatches) {
			headerMatches.forEach(function (header) {
				var parts = header.match(/-H\s+['"]([^:]+):\s?([^"']+)['"]/);
				if (parts) r.headers[parts[1]] = parts[2];
			});
		}
		var methodMatch = cmd.match(/-X\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|LINK|UNLINK|LOCK|UNLOCK|COPY|VIEW|PROPFIND)/i);
		if (methodMatch) r.method = methodMatch[1].toUpperCase();
		var dataMatch = cmd.match(/--data-raw\s+(['"])((?:(?!\1).)*)\1/);
		if (dataMatch) {
			r.body = JSON.parse(dataMatch[2]);
			if (r.method === 'GET') r.method = 'POST';
		}
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'LINK', 'UNLINK', 'LOCK', 'UNLOCK', 'COPY', 'VIEW', 'PROPFIND'].includes(r.method)) {
			r.method = r.body ? 'POST' : 'GET';
		}
		return r;
	},
	powershell: function (cmd) {
		var r = { headers: {}, body: {}, address: '', method: 'GET', options: {} };
		var urlMatch = cmd.match(/-Uri\s+"([^"]+)"/);
		if (urlMatch) r.address = urlMatch[1];
		var headerMatches = cmd.match(/-Headers\s+@{\s*([^}]+)\s*}/);
		if (headerMatches) {
			var headers = headerMatches[1]
				.split(/\r?\n/)
				.map(function (h) {
					return h.trim();
				})
				.filter(Boolean);
			headers.forEach(function (header) {
				var parts = header.match(/"([^"]+)"="([^"]+)"/);
				if (parts) {
					var key = parts[1];
					var value = parts[2].replace(/`"/g, '"');
					if (key.toLowerCase() !== 'method') {
						r.headers[key] = value;
					} else {
						r.method = value.toUpperCase();
					}
				}
			});
		}
		var bodyMatch = cmd.match(/-Body\s+(['"])([^\1]+)\1/);
		if (bodyMatch) {
			r.body = JSON.parse(bodyMatch[2].replace(/`"/g, '"'));
			if (r.method === 'GET') r.method = 'POST';
		}
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'LINK', 'UNLINK', 'LOCK', 'UNLOCK', 'COPY', 'VIEW', 'PROPFIND'].includes(r.method)) {
			r.method = r.body ? 'POST' : 'GET';
		}
		return r;
	},
	wget: function (cmd) {
		var jsonOutput = { headers: {}, body: {}, address: '', method: '' };
		var methodRegex = /--method\s+(\w+)/;
		var methodMatch = cmd.match(methodRegex);
		jsonOutput.method = methodMatch ? methodMatch[1] : 'GET';
		var headersRegex = /--header\s+'([^']+:[^']+)'/g;
		var headerMatch;
		while ((headerMatch = headersRegex.exec(cmd)) !== null) {
			var headerParts = headerMatch[1].split(': ');
			jsonOutput.headers[headerParts[0]] = headerParts[1];
		}
		var addressRegex = /'(https?:\/\/[^']+)'/;
		var addressMatch = cmd.match(addressRegex);
		jsonOutput.address = addressMatch ? addressMatch[1] : '';
		var bodyDataRegex = /--body-data\s+'([^']+)'/;
		var bodyDataMatch = cmd.match(bodyDataRegex);
		if (bodyDataMatch) {
			var bodyData = bodyDataMatch[1].trim();
			try {
				jsonOutput.body = JSON.parse(JSON.parse(JSON.stringify(bodyData)).replace(/[^\x20-\x7E]/g, ' '));
			} catch (error) {
				console.error('Error parsing body data:', error);
			}
		}

		return jsonOutput;
	},
	axg: (cmd: string) => {
		return JSON.parse(JSON.parse(JSON.stringify(cmd)).replace(/[^\x20-\x7E]/g, ' '));
	},
	http: (cmd) => {
		const lines = cmd.split('\n');
		const [method, address] = lines[0].split(' ');
		const protocol = 'https:';
		const headers = {};
		let bodyString = '';
		let bodyStarted = false;
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (bodyStarted) {
				bodyString += line;
			} else {
				if (line.startsWith('{')) {
					bodyStarted = true;
					bodyString += line;
				} else {
					if (line) {
						const [key, ...value] = line.split(': ');
						headers[key] = value.join(': ');
					}
				}
			}
		}
		let body = {};
		if (bodyString) {
			try {
				body = JSON.parse(bodyString);
			} catch (error) {
				console.error('Error parsing body:', error);
			}
		}
		const fullAddress = `${protocol}//${headers['Host'] || ''}${address}`;
		delete headers[''];
		const parsed = {
			address: fullAddress,
			method: method || 'GET',
			headers: headers,
			body: body
		};
		return parsed;
	}
};

// Import request

function importRequest(): void {
	if (importType === null) return;
	const importInput = document.querySelector('.import-input .input-4') as HTMLElement;
	setImport(null);
	parseaxgFile(importParsers[importType](importInput.innerText));
}

// Create JSON interpretation of data

function createJsonForData() {
	let h = JSON.stringify('{' + s.headers.innerText + '}');
	h = h.replace(/\s/g, '').endsWith(',}"') ? h.slice(0, -3) + '}"' : h;
	let b = JSON.stringify('{' + s.body.innerText + '}');
	b = b.replace(/\s/g, '').endsWith(',}"') ? b.slice(0, -3) + '}"' : b;
	let o = JSON.stringify('{' + s.options.innerText + '}');
	o = o.replace(/\s/g, '').endsWith(',}"') ? o.slice(0, -3) + '}"' : o;
	let r = JSON.stringify(document.querySelector<HTMLElement>('#pre-request-input').innerText);
	let t = JSON.stringify(document.querySelector<HTMLElement>('#post-request-input').innerText);
	return {
		headers: JSON.parse(JSON.parse(h)),
		body: JSON.parse(JSON.parse(b)),
		options: JSON.parse(JSON.parse(o)),
		address: s.address.value,
		method: method,
		preScript: r,
		postScript: t
	};
}

// Export as .axg

function exportAsaxg() {
	const jsonStr = JSON.stringify(createJsonForData(), null, 4);
	const blob = new Blob([jsonStr], { type: 'application/json' });
	const link = document.createElement('a');
	link.download = 'save.axg';
	link.href = window.URL.createObjectURL(blob);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

// JSON path

let jsonpathInterval = null;

function useJSONPATH(e, timeout = 1000) {
	if (jsonpathInterval != null) {
		clearTimeout(jsonpathInterval);
	}
	jsonpathInterval = setTimeout(() => {
		const x = document.querySelector<HTMLElement>('#subtab-response');
		const json = resData;
		if (e.value.replace(/\s+/g, '') == '') {
			x.innerHTML = highlightJSON(JSON.stringify(resData, null, 4));
		} else {
			x.innerHTML = highlightJSON(JSON.stringify(JSONPath.JSONPath({ path: e.value, json: json }), null, 4));
		}
	}, timeout);
}

// Highlight JSON

function highlightJSON(jsonString) {
	return jsonString.replace(
		/("[^"]*")|(:\s*("[^"]*"))|(\{)|(\})|(:)/g,
		function (match: string, p1: string, p2: string, p3: string, p4: string, p5: string, p6: string): string {
			if (p1) return `<span style="color: #7EA1FF;">${p1}</span>`;
			else if (p3) return `<span style="color: #FEEFAD;"><span style="color: #F27BBD;">:</span> ${p3}</span>`;
			else if (p4 || p5) return `<span style="color: #F97300;">${p4 || p5}</span>`;
			else if (p6) return `<span style="color: #F27BBD;">${p6}</span>`;
			return '';
		}
	);
}

// Send request

function sendRequest(): void {
	document.querySelector<HTMLElement>('#tab-response .curlies').style.display = 'none';
	document.querySelector<HTMLElement>('#tab-response .content').style.display = 'block';
	document.querySelector<HTMLElement>('#tab-response .subtab').style.display = 'none';
	document.querySelector<HTMLElement>('#tab-response .content')!.innerHTML = `
      <div class="sending">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path fill="#fff" d="M440-183v-274L200-596v274l240 139Zm80 0 240-139v-274L520-457v274Zm-40-343 237-137-237-137-237 137 237 137ZM160-252q-19-11-29.5-29T120-321v-318q0-22 10.5-40t29.5-29l280-161q19-11 40-11t40 11l280 161q19 11 29.5 29t10.5 40v318q0 22-10.5 40T800-252L520-91q-19 11-40 11t-40-11L160-252Zm320-228Z"/></svg>
        <h1>Sending...</h1>
      </div>
    `;
	document.querySelector<HTMLElement>('footer > p')!.innerText = 'Sending...';

	const info = getData();

	const send = document.querySelector<HTMLElement>('#info .send-group');
	send.style.display = 'none';
	document.querySelector<HTMLElement>('.cancel').style.display = 'block';

	const tabOutHeaders = document.querySelector<HTMLElement>('.tab-buttons .headers');
	if (tabOutHeaders) {
		tabOutHeaders.innerText = 'Headers';
	}

	const tabOutResponse = document.querySelector<HTMLElement>('.tab-buttons .response');
	if (tabOutResponse) {
		tabOutResponse.innerText = 'Response';
	}

	fetch('/fetch', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(info)
	})
		.then((r) => r.json())
		.then((response) => {
			const data = response.result;
			try {
				const jsonData = JSON.parse(data);
				document.querySelector<HTMLElement>('#tab-response .content').style.display = 'none';
				document.querySelector<HTMLElement>('#tab-response .subtab').style.display = 'block';
				const rawContent = document.querySelector<HTMLElement>('#tab-response .subtab #subtab-response');
				if (rawContent) {
					rawContent.innerText = JSON.stringify(jsonData, null, 4);
				}
				const jsonString = JSON.stringify(jsonData, null, 4);

				const highlightedJson = highlightJSON(jsonString);

				resData = jsonData;

				document.querySelector<HTMLElement>('#tab-response .curlies').style.display = 'flex';

				if (rawContent) {
					rawContent.innerHTML = highlightedJson;
				}

				if (jsonData.hasOwnProperty('errorFromaxoget') && jsonData['errorFromaxoget'] == true) {
					disableCancel();
					const statusP = document.querySelector<HTMLElement>('footer > p');
					if (statusP) {
						statusP.innerText = 'Failed';
					}
					return;
				}
			} catch (e) {
				document.querySelector<HTMLElement>('#tab-response .content').style.display = 'none';
				document.querySelector<HTMLElement>('#tab-response .subtab').style.display = 'block';
				const rawContent = document.querySelector<HTMLElement>('#tab-response .subtab #subtab-response');
				if (rawContent) {
					rawContent.innerText = data;
				}
			}

			const statusP = document.querySelector<HTMLElement>('footer > p');
			if (statusP) {
				statusP.innerHTML = response.time + ' • ' + response.size + ' • ' + formatStatusCode(Number(response.status));
			}

			const headersOutInput3 = document.querySelector<HTMLElement>('#tab-out-headers .input-3');
			if (headersOutInput3) {
				headersOutInput3.innerHTML = '';
			}

			const tabOutHeaders = document.querySelector<HTMLElement>('.tab-buttons .headers');
			if (tabOutHeaders) {
				tabOutHeaders.innerHTML = `Headers (${response.headersCount} - ${response.headersSize})`;
			}

			const tabOutResponse = document.querySelector<HTMLElement>('.tab-buttons .response');
			if (tabOutResponse) {
				tabOutResponse.innerHTML = `Response (${response.bodySize})`;
			}

			for (const [key, value] of Object.entries(response.headers)) {
				const headersOutInput3 = document.querySelector<HTMLElement>('#tab-out-headers .input-3');
				if (headersOutInput3) {
					headersOutInput3.innerHTML += `<div>"${key}": "${value}"</div>`;
				}
			}

			const htmlLoad = document.querySelector<HTMLIFrameElement>('#render-iframe');
			const rawhtml = document.querySelector<HTMLIFrameElement>('#preview-iframe');
			if (htmlLoad && htmlLoad.contentDocument) {
				htmlLoad.contentDocument.open();
				const regex = /<link\s+rel="stylesheet"\s+href="(?!https:\/\/).*?"\s*\/>/g;
				function replaceHttps(match: string) {
					return match.replace('href="', `href="${data.address}`);
				}
				const regex2 = /<script[^>]+src="(?!https:\/\/).*?"[^>]*><\/script>/g;
				function replaceScript(match: string) {
					return match.replace('src="', `src="${data.address}`);
				}
				htmlLoad.contentDocument.write(data.replace(regex2, replaceScript).replace(regex, replaceHttps));
				htmlLoad.contentDocument.close();
			}

			if (rawhtml && rawhtml.contentDocument) {
				rawhtml.contentDocument.open();
				rawhtml.contentDocument.write(data);
				rawhtml.contentDocument.close();
			}

			disableCancel();
		});
}

// Cancel request and disable cancel button

function cancelRequest(): void {
	fetch('/save-data', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(createJsonForData())
	})
		.then((res) => res.json())
		.then((response) => {
			if (response.success == true) {
				window.location.reload();
			}
		});
}

function disableCancel(): void {
	document.querySelector<HTMLElement>('#info .send-group').style.display = 'block';
	document.querySelector<HTMLElement>('.cancel').style.display = 'none';
}

// Modified input

document.querySelectorAll('div[contenteditable]').forEach((div) => {
	div.addEventListener('keydown', function (e) {
		const keyEvent = e as KeyboardEvent;
		if (keyEvent.key === 'Tab' && keyEvent.shiftKey) {
			keyEvent.preventDefault();
			const selection = window.getSelection();
			if (!selection.rangeCount) return;

			const range = selection.getRangeAt(0);
			const node = range.startContainer;
			const offset = range.startOffset;

			if (node.nodeType === Node.TEXT_NODE && offset >= 4 && node.textContent.slice(offset - 4, offset) === '    ') {
				range.setStart(node, offset - 4);
				range.setEnd(node, offset);
				range.deleteContents();
			}
		} else if (keyEvent.key === 'Tab') {
			keyEvent.preventDefault();
			document.execCommand('insertText', false, '    ');
		} else if (['"', "'", '(', '{', '[', '<'].includes(keyEvent.key)) {
			keyEvent.preventDefault();
			const pairMap = {
				'"': '"',
				"'": "'",
				'(': ')',
				'{': '}',
				'[': ']',
				'<': '>'
			};
			const pair = pairMap[keyEvent.key];
			const selection = window.getSelection();
			const range = selection.getRangeAt(0);
			range.deleteContents();
			const startNode = document.createTextNode(keyEvent.key);
			const endNode = document.createTextNode(pair);
			range.insertNode(endNode);
			range.insertNode(startNode);
			range.setStart(startNode, 1);
			range.setEnd(startNode, 1);
			selection.removeAllRanges();
			selection.addRange(range);
		} else if (keyEvent.key === 'x' && keyEvent.ctrlKey) {
			keyEvent.preventDefault();
			const selection = window.getSelection();
			if (!selection.rangeCount) return;
			const range = selection.getRangeAt(0);
			let start = range.startContainer;
			while (start && start.nodeType !== Node.ELEMENT_NODE) {
				start = start.parentNode;
			}
			let end = range.endContainer;
			while (end && end.nodeType !== Node.ELEMENT_NODE) {
				end = end.parentNode;
			}
			if (start && end && start === end && start.nodeType === Node.ELEMENT_NODE) {
				const lineText = start.textContent;
				navigator.clipboard.writeText(lineText).then(() => {
					start.textContent = '';
				}).catch(err => {
					console.error('Failed to copy text: ', err);
				});
			}
		} else if (keyEvent.key === 'Home') {
			keyEvent.preventDefault();
			const selection = window.getSelection();
			if (!selection.rangeCount) return;
			const range = selection.getRangeAt(0);
			const node = range.startContainer;
			const offset = range.startOffset;
			const lineText = node.textContent;
			let newOffset = 0;
			for (let i = 0; i < lineText.length; i++) {
				if (lineText[i] !== ' ' && lineText[i] !== '\t') {
					newOffset = i;
					break;
				}
			}
			if (offset === newOffset || offset === 0) {
				newOffset = 0;
			}
			range.setStart(node, newOffset);
			range.setEnd(node, newOffset);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	});
});

let inputInterval = null;

document.querySelectorAll('.tab-group .input-1').forEach((i) => {
	i.addEventListener('input', () => {
		if (inputInterval != null) {
			clearInterval(inputInterval);
		}
		inputInterval = setTimeout(() => {
			i.parentElement.querySelector<HTMLElement>('.curlies .info').innerText = stringSizeUnit(calculateStringSize((i as HTMLElement).innerText));
		}, 1000);
	});
});

// Handle paste event

function handlePaste(event: ClipboardEvent) {
	event.preventDefault();
	const clipboardData = event.clipboardData || (window as any).clipboardData;
	const pastedText = clipboardData?.getData('text/plain') || '';
	document.execCommand('inserttext', false, pastedText);
}

// Set content size for input fields

function setInputSize() {
	try {
		document.querySelectorAll('.tab-group .input-1').forEach((i) => {
			i.parentElement.querySelector<HTMLElement>('.curlies .info').innerText = stringSizeUnit(calculateStringSize((i as HTMLElement).innerText));
		});
	} catch (e) {
		return;
	}
}

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

function getData(): {
	address: string;
	headers: string;
	body: string;
	options: string;
	method: string;
	preScript: string;
	postScript: string;
} {
	return {
		address: (document.querySelector('#info .input-wrapper input') as HTMLInputElement).value,
		headers: '{' + `"Content-Type": "${contentType}",` + s.headers.innerText + '}',
		body: '{' + s.body.innerText + '}',
		options: s.options.innerText,
		method,
		preScript: (document.querySelector('#pre-request-input') as HTMLElement).innerText,
		postScript: (document.querySelector('#post-request-input') as HTMLElement).innerText
	};
}

function formatStatusCode(statusCode) {
	let color;
	let statusMessage;

	switch (Math.floor(statusCode / 100)) {
		case 1:
			color = '#FFC55A';
			statusMessage = '(Informational)';
			break;
		case 2:
			color = '#8DECB4';
			statusMessage = '(Success)';
			break;
		case 3:
			color = '#FF204E';
			statusMessage = '(Redirection)';
			break;
		case 4:
			color = '#E59BE9';
			statusMessage = '(Client Error)';
			break;
		case 5:
			color = '#5AB2FF';
			statusMessage = '(Server Error)';
			break;
		default:
			color = '#FF204E';
			statusMessage = '(Unknown)';
			break;
	}

	return `<span style="color: ${color};">${statusCode}</span> ${statusMessage}`;
}
