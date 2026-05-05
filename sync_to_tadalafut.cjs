const fs = require('fs');

const selvaAppPath = 'C:/Users/pedro/OneDrive/Área de Trabalho/app_selva/src/App.jsx';
const selvaCssPath = 'C:/Users/pedro/OneDrive/Área de Trabalho/app_selva/src/index.css';

const tadaAppPath = 'C:/Users/pedro/OneDrive/Área de Trabalho/app_tadalafut/src/App.jsx';
const tadaCssPath = 'C:/Users/pedro/OneDrive/Área de Trabalho/app_tadalafut/src/index.css';

// Read Selva files
let selvaApp = fs.readFileSync(selvaAppPath, 'utf8');
let selvaCss = fs.readFileSync(selvaCssPath, 'utf8');

// Replace local storage keys
selvaApp = selvaApp.replace(/selva_user_id/g, 'tadalafut_user_id');
selvaApp = selvaApp.replace(/selva_data_v2/g, 'tadalafut_data_v2');

// Replace Firebase config
const selvaConfigStart = selvaApp.indexOf('const firebaseConfig = {');
const selvaConfigEnd = selvaApp.indexOf('};', selvaConfigStart) + 2;

const tadaConfig = `const firebaseConfig = {
  apiKey: "AIzaSyCNe-4UH8HejtLU1nR-D6CdlgCjXe3V-3w",
  authDomain: "pelada-tadalafut.firebaseapp.com",
  databaseURL: "https://pelada-tadalafut-default-rtdb.firebaseio.com",
  projectId: "pelada-tadalafut",
  storageBucket: "pelada-tadalafut.firebasestorage.app",
  messagingSenderId: "173253318678",
  appId: "1:173253318678:web:37b9b2377a1768baf97d37"
};`;

selvaApp = selvaApp.substring(0, selvaConfigStart) + tadaConfig + selvaApp.substring(selvaConfigEnd);

// Save to Tadalafut
fs.writeFileSync(tadaAppPath, selvaApp);
fs.writeFileSync(tadaCssPath, selvaCss);
console.log('App and CSS copied from app_selva to app_tadalafut with custom replacements applied.');
