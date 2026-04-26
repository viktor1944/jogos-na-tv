async function fetchJogos(url) {
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  const data = await res.json();
  const text = data.contents || '';

  const jogos = [];
  // O site usa markdown-style nos headings: ### **HHhMM – Time x Time – Liga**
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Procura linhas com horário no padrão HHhMM
    const m = line.match(/(\d{1,2}h\d{2})\s*[–\-]\s*(.+?)\s*[–\-]\s*(.+?)(?:\*\*)?$/i);
    if (m) {
      // Próxima linha não vazia deve ter os canais
      let tv = '';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const next = lines[j].trim();
        if (next.toLowerCase().includes('canal')) {
          tv = next.replace(/\*\*/g, '').replace(/canais?:\s*/i, '').trim();
          break;
        }
      }
      jogos.push({
        time: m[1].trim(),
        teams: m[2].replace(/\*/g, '').trim(),
        league: m[3].replace(/\*/g, '').trim(),
        tv
      });
    }
  }
  return jogos;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    const [hoje, amanha] = await Promise.all([
      fetchJogos('https://mantosdofutebol.com.br/guia-de-jogos-tv-hoje-ao-vivo/'),
      fetchJogos('https://mantosdofutebol.com.br/jogos-de-amanha-tv/')
    ]);

    res.status(200).json({ hoje, amanha, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
