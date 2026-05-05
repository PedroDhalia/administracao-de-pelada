import fs from 'fs';

let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add Icons
code = code.replace(
    /import \{\n  Trophy, Users, Target, Plus, Minus, Trash2, User, Star, Info,\n  Flag, Goal, Calendar, ChevronLeft, ChevronDown, ChevronUp, UserPlus, Flame, Medal, Circle, Pencil,\n  LogOut, Shield, ShieldAlert\n\} from 'lucide-react';/,
    `import {\n  Trophy, Users, Target, Plus, Minus, Trash2, User, Star, Info,\n  Flag, Goal, Calendar, ChevronLeft, ChevronDown, ChevronUp, UserPlus, Flame, Medal, Circle, Pencil,\n  LogOut, Shield, ShieldAlert, Key, Database, Eye, EyeOff\n} from 'lucide-react';`
);

// 2. Add State
code = code.replace(
    /const \[showAdminModal, setShowAdminModal\] = useState\(false\);/,
    `const [showAdminModal, setShowAdminModal] = useState(false);\n  const [showSupremeAdmin, setShowSupremeAdmin] = useState(false);\n  const [visiblePasswords, setVisiblePasswords] = useState({});`
);

// 3. Add handlers
const handlers = `
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleChangePassword = (userId) => {
    const newPassword = prompt("Digite a nova senha para este usuário:");
    if (!newPassword || newPassword.trim() === '') return;
    const newUsers = users.map(u => u.id === userId ? { ...u, password: newPassword.trim() } : u);
    set(ref(db, 'users'), newUsers);
    alert("Senha alterada com sucesso!");
  };

  const promoteToGlobalAdmin = (userId) => {
    if(!confirm("Tem certeza que quer dar poder absoluto para este usuário?")) return;
    const newUsers = users.map(u => u.id === userId ? { ...u, is_admin: true } : u);
    set(ref(db, 'users'), newUsers);
  };
`;
code = code.replace(/const handleLogout = \(\) => \{/g, handlers + '\n  const handleLogout = () => {');

// 4. Add Button in main header
const adminButton = `{isGlobalAdmin && <button onClick={() => setShowSupremeAdmin(true)} className="icon-btn" style={{ padding: '6px 12px', backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(234, 179, 8, 0.3)' }} title="Painel de Controle"><Database size={14} /> Sistema</button>}`;
code = code.replace(/<button onClick=\{handleLogout\}/, adminButton + '\n             <button onClick={handleLogout}');

// 5. Add Modal render inside main return statement (before </main> or below <header>)
const supremeModal = `
      {showSupremeAdmin && isGlobalAdmin && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99999, padding: 24, overflowY: 'auto' }}>
             <div className="card animated" style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
                   <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#eab308', margin: 0 }}><Database /> Área do Admin Supremo</h2>
                   <button className="icon-btn danger" style={{ color: 'var(--text-muted)' }} onClick={() => setShowSupremeAdmin(false)}>Fechar (X)</button>
                </header>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: 12 }}>Nome</th>
                        <th style={{ padding: 12 }}>E-mail</th>
                        <th style={{ padding: 12 }}>Senha</th>
                        <th style={{ padding: 12 }}>Jogador Vinculado</th>
                        <th style={{ padding: 12 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.sort((a,b) => a.name.localeCompare(b.name)).map(u => {
                        const linkedPlayer = registeredPlayers.find(p => p.id === u.jogadorId);
                        return (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                               {u.name} {u.is_admin && <Shield size={14} color="#eab308" title="Admin Global" />}
                            </td>
                            <td style={{ padding: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                            <td style={{ padding: 12 }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 4, letterSpacing: visiblePasswords[u.id] ? 'normal' : '2px' }}>
                                    {visiblePasswords[u.id] ? u.password : '••••••••'}
                                  </span>
                                  <button className="icon-btn" style={{ padding: 4, color: 'var(--text-muted)' }} onClick={() => togglePasswordVisibility(u.id)}>
                                     {visiblePasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                               </div>
                            </td>
                            <td style={{ padding: 12 }}>
                               {linkedPlayer ? <span style={{ color: 'var(--primary)' }}>{linkedPlayer.name}</span> : <span style={{ color: 'var(--danger)' }}>Nenhum</span>}
                            </td>
                            <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                               <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleChangePassword(u.id)}><Key size={12} style={{ marginRight: 4 }}/> Trocar Senha</button>
                               {!u.is_admin && <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, backgroundColor: 'transparent', border: '1px solid #eab308', color: '#eab308' }} onClick={() => promoteToGlobalAdmin(u.id)}><Shield size={12} style={{ marginRight: 4 }}/> Promover</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
             </div>
          </div>
      )}
`;

code = code.replace(/<main className="main-content">/, supremeModal + '\n        <main className="main-content">');

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Admin Supreme injected!');
