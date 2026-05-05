import fs from 'fs';

let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Imports
code = code.replace(
    /Eye, EyeOff\n\} from 'lucide-react';/,
    `Eye, EyeOff, Camera\n} from 'lucide-react';`
);

// 2. State
code = code.replace(
    /const \[showSupremeAdmin, setShowSupremeAdmin\] = useState\(false\);/,
    `const [showSupremeAdmin, setShowSupremeAdmin] = useState(false);\n  const [showProfile, setShowProfile] = useState(false);\n  const [isUploading, setIsUploading] = useState(false);`
);

// 3. Handlers and Component
const newHandlers = `
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const compressedImage = await compressImage(file);
      const newUsers = users.map(u => u.id === currentUser.id ? { ...u, avatar: compressedImage } : u);
      set(ref(db, 'users'), newUsers);
    } catch(err) {
      alert("Erro ao enviar imagem");
    }
    setIsUploading(false);
  };

  const removeAvatar = () => {
    const newUsers = users.map(u => u.id === currentUser.id ? { ...u, avatar: null } : u);
    set(ref(db, 'users'), newUsers);
  };

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    };
  };

  const PlayerAvatar = ({ playerName, size = 32 }) => {
    let avatarUrl = null;
    let initial = '?';
    if (playerName) {
      initial = playerName.charAt(0).toUpperCase();
      const rp = registeredPlayers.find(r => r.name.toLowerCase() === playerName.toLowerCase());
      if (rp && rp.userId) {
         const u = users.find(us => us.id === rp.userId);
         if (u && u.avatar) avatarUrl = u.avatar;
      }
    }
    if (avatarUrl) {
      return <img src={avatarUrl} alt={playerName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }} />;
    }
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.45, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
        {initial}
      </div>
    );
  };
`;
code = code.replace(/const promoteToGlobalAdmin = \(userId\) => \{.*?\n  \};\n/s, `$&${newHandlers}`);

// 4. Onboarding UI
const onboardingUI = `        <h2 style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: 24 }}>Bem-vindo, {currentUser.name}!</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 12 }}>
           <div style={{ position: 'relative' }}>
              <PlayerAvatar playerName={currentUser.name} size={90} />
              {isUploading && <div style={{ position: 'absolute', top:0, left:0, bottom:0, right:0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner">⏳</span></div>}
           </div>
           <label className="btn-primary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Camera size={14} style={{ marginRight: 6 }}/> Adicionar foto (opcional)
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
           </label>
        </div>
        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text-muted)' }}>Precisamos vincular`;
code = code.replace(/<h2 style=\{\{ textAlign: 'center', color: 'var\(--primary\)', marginBottom: 24 \}\}>Bem-vindo, \{currentUser\.name\}!<\/h2>\s*<p style=\{\{ textAlign: 'center', marginBottom: 24, color: 'var\(--text-muted\)' \}\}>Precisamos vincular/, onboardingUI);

// 5. App Header / Profile button and Profile Render
const profileRender = `
  if (showProfile) {
    return (
      <div className="app-container" style={{ padding: 24, maxWidth: 600, margin: '0 auto', justifyContent: 'center' }}>
        <header className="header" style={{ marginBottom: 24 }}>
          <button className="back-btn" onClick={() => setShowProfile(false)}>
            <ChevronLeft size={28} />
          </button>
          <h1>Meu Perfil</h1>
        </header>

        <div className="card animated" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
           <div style={{ position: 'relative' }}>
              <PlayerAvatar playerName={currentUser?.name} size={120} />
              {isUploading && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span className="spinner">⏳</span>
                  </div>
              )}
           </div>
           
           <div style={{ textAlign: 'center' }}>
             <h2 style={{ margin: 0 }}>{currentUser?.name}</h2>
             <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>{currentUser?.email}</p>
           </div>

           <div style={{ display: 'flex', gap: 16 }}>
              <label className="btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={16} /> Alterar Foto
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              </label>
              {currentUser?.avatar && (
                 <button className="btn-primary" style={{ backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={removeAvatar}>
                    Remover Foto
                 </button>
              )}
           </div>
        </div>
      </div>
    );
  }
`;
code = code.replace(/if \(!activeSessionId\) \{/, profileRender + '\n\n  if (!activeSessionId) {');

const headerProfileBtn = `<span onClick={() => setShowProfile(true)} style={{ cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', padding: '6px 16px 6px 6px', borderRadius: 30, transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.05)'}>
                <PlayerAvatar playerName={currentUser?.name} size={30} />
                <span style={{ fontWeight: 600 }}>{currentUser?.name}</span>
                {isGlobalAdmin && <Shield size={14} color="var(--primary)" title="Administrador Global" />}
             </span>`;
code = code.replace(/<span style=\{\{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba\(255,255,255,0\.05\)', padding: '6px 12px', borderRadius: 20 \}\}>\s*<User size=\{14\} color="var\(--text-muted\)" \/>\s*\{currentUser\?\.name\}\s*\{isGlobalAdmin && <Shield size=\{14\} color="var\(--primary\)" title="Administrador Global" \/>\}\s*<\/span>/, headerProfileBtn);

// 6. Highlight Name Avatar
const highlightAvatar = `<span className="hl-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {val > 0 && !hasMultiple && <PlayerAvatar playerName={statObj.name} size={24} />}
                                  {val > 0 ? statObj.name : '-'}`;
code = code.replace(/<span className="hl-name">\s*\{val > 0 \? statObj\.name : '-'\}/, highlightAvatar);

// 7. Global Jogadores List Avatar
const globalPlayerAvatar = `<span className="card-title" style={{ fontSize: 18, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <PlayerAvatar playerName={p.name} size={36} />
                            {p.name}
                          </span>`;
code = code.replace(/<span className="card-title" style=\{\{ fontSize: 18, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' \}\}>\s*<User size=\{20\} color="var\(--primary\)" \/>\s*\{p\.name\}\s*<\/span>/, globalPlayerAvatar);

// 8. Session Ranking Avatars
// Top Scorers / Assists
code = code.replace(
  /<div className="left-part">\s*<span\s*className="rank-badge"/g,
  `<div className="left-part" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>\n                          <span\n                            className="rank-badge"`
);
// We need to inject <PlayerAvatar /> right after the rank badge ending </span> inside ranking item
// Wait, regex might be tricky for nested spans. Instead of parsing, I will replace the exact text structure for MVP and Scorers
const rankingScoreVal = `</span>\n                          <PlayerAvatar playerName={p.name} size={28} />\n                          <span>{p.name} <span className="team-name">({p.teamName})</span></span>`;
code = code.replace(/<\/span>\s*<span>\{p\.name\} <span className="team-name">\(\{p\.teamName\}\)<\/span><\/span>/g, rankingScoreVal);

const rankingNotaVal = `</span>\n                            <PlayerAvatar playerName={p.name} size={28} />\n                            <span>{p.name} {idx === 0 && <span title="MVP da Pelada" style={{ fontSize: 14 }}>👑</span>}</span>`;
code = code.replace(/<\/span>\s*<span>\{p\.name\} \{idx === 0 && <span title="MVP da Pelada" style=\{\{ fontSize: 14 \}\}>👑<\/span>\}<\/span>/g, rankingNotaVal);

const rankingTeamVal = `</span>\n                          <span>{t.name}</span>`; // don't add avatar for teams
code = code.replace(/<\/span>\s*<span>\{t\.name\}<\/span>/g, rankingTeamVal); // reset just in case

// 9. Session Teams Player List Avatar
const teamPlayerHeader = `<span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <PlayerAvatar playerName={player.name} size={30} />
                                      {player.name}`;
code = code.replace(/<span style=\{\{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' \}\}>\s*\{player\.name\}/g, teamPlayerHeader);

// 10. Supreme Admin List Avatar
const supremePlayerAvatar = `<td style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                               <PlayerAvatar playerName={linkedPlayer?.name || ''} size={32} />
                               {u.name} {u.is_admin && <Shield size={14} color="#eab308" title="Admin Global" />}
                            </td>`;
code = code.replace(/<td style=\{\{ padding: 12, display: 'flex', alignItems: 'center', gap: 6 \}\}>\s*\{u\.name\} \{u\.is_admin && <Shield size=\{14\} color="#eab308" title="Admin Global" \/>\}\s*<\/td>/g, supremePlayerAvatar);


fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Avatars applied beautifully.');
