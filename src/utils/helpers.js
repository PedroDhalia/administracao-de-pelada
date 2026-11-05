export const getTextColor = (bgColor) => {
  if (!bgColor) return '#ffffff';
  const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

export const compressImage = async (file) => {
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
  });
};
export const getTeamColor = (teamName) => {
  if (!teamName) return 'var(--primary)';
  const lower = teamName.toLowerCase();
  if (lower.includes('branco')) return '#ffffff';
  if (lower.includes('preta') || lower.includes('preto')) return '#1a1a1a';
  if (lower.includes('verde')) return '#22c55e';
  if (lower.includes('azul')) return '#3b82f6';
  if (lower.includes('vermelho')) return '#ef4444';
  if (lower.includes('amarelo')) return '#eab308';
  if (lower.includes('roxo')) return '#a855f7';
  if (lower.includes('rosa')) return '#ec4899';
  if (lower.includes('laranja')) return '#f97316';
  if (lower.includes('cinza')) return '#9ca3af';
  if (lower.includes('sem camisa') || lower.includes('colete')) return '#fcd34d';
  return 'var(--primary)';
};

export const getNotaColor = (nota) => {
  if (nota >= 9.0) return '#30d158'; // Verde premium
  if (nota >= 8.0) return '#0084ff'; // Azul premium
  if (nota >= 7.0) return '#ffd60a'; // Ouro/Amarelo premium
  if (nota >= 6.0) return '#ff9f0a'; // Laranja premium
  return '#ff453a'; // Vermelho premium
};

