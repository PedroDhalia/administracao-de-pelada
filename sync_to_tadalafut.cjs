const fs = require('fs');
const path = require('path');

const selvaSrc = path.join(__dirname, 'src');
const tadaSrc = path.resolve(__dirname, '../app_tadalafut/src');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

// 1. Copy folders
const foldersToCopy = ['components', 'constants', 'hooks', 'pages', 'utils', 'api'];
foldersToCopy.forEach(folder => {
  copyFolderSync(path.join(selvaSrc, folder), path.join(tadaSrc, folder));
});

// 2. Read App.jsx from Selva
let selvaApp = fs.readFileSync(path.join(selvaSrc, 'App.jsx'), 'utf8');

// Replace local storage keys
selvaApp = selvaApp.replace(/selva_user_id/g, 'tadalafut_user_id');
selvaApp = selvaApp.replace(/selva_data_v2/g, 'tadalafut_data_v2');

// Save App.jsx to Tadalafut
fs.writeFileSync(path.join(tadaSrc, 'App.jsx'), selvaApp);

// Replace local storage keys in useAuth.js
const tadaAuthPath = path.join(tadaSrc, 'hooks/useAuth.js');
if (fs.existsSync(tadaAuthPath)) {
  let tadaAuth = fs.readFileSync(tadaAuthPath, 'utf8');
  tadaAuth = tadaAuth.replace(/selva_user_id/g, 'tadalafut_user_id');
  tadaAuth = tadaAuth.replace(/selva_data_v2/g, 'tadalafut_data_v2');
  fs.writeFileSync(tadaAuthPath, tadaAuth);
}

// 3. Copy CSS files
fs.copyFileSync(path.join(selvaSrc, 'index.css'), path.join(tadaSrc, 'index.css'));
if (fs.existsSync(path.join(selvaSrc, 'compare.css'))) {
  fs.copyFileSync(path.join(selvaSrc, 'compare.css'), path.join(tadaSrc, 'compare.css'));
}

// 4. Update Firebase config in Tadalafut
const tadaFirebasePath = path.join(tadaSrc, 'api/firebase.js');
let tadaFirebase = fs.readFileSync(tadaFirebasePath, 'utf8');

const configStart = tadaFirebase.indexOf('const firebaseConfig = {');
const configEnd = tadaFirebase.indexOf('};', configStart) + 2;

const tadaConfig = `const firebaseConfig = {
  apiKey: "AIzaSyCNe-4UH8HejtLU1nR-D6CdlgCjXe3V-3w",
  authDomain: "pelada-tadalafut.firebaseapp.com",
  databaseURL: "https://pelada-tadalafut-default-rtdb.firebaseio.com",
  projectId: "pelada-tadalafut",
  storageBucket: "pelada-tadalafut.firebasestorage.app",
  messagingSenderId: "173253318678",
  appId: "1:173253318678:web:37b9b2377a1768baf97d37"
};`;

tadaFirebase = tadaFirebase.substring(0, configStart) + tadaConfig + tadaFirebase.substring(configEnd);
fs.writeFileSync(tadaFirebasePath, tadaFirebase);

console.log('Successfully synced app_selva to app_tadalafut with custom replacements applied.');
