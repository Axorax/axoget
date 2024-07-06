const fs = require('fs');
const path = 'src/static/script.js';
const searchString = 'Object.defineProperty(exports, "__esModule", { value: true });';
const replacementString = '';

fs.readFile(path, 'utf8', (err, data) => {
	if (err) {
		console.error('Error reading file:', err);
		return;
	}

	if (data.includes(searchString)) {
		const modifiedContent = data.replace(searchString, replacementString);

		fs.writeFile(path, modifiedContent, 'utf8', (err) => {
			if (err) {
				console.error('Error writing file:', err);
				return;
			}
			console.log('[axoget]: File "src/static/script.js" has been fixed successfully!');
		});
	} else {
		console.log('[axoget]: No errors found in file.');
	}
});
