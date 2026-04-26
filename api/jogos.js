export const revalidate = 3600; // cache por 1 hora

async function fetchJogos(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  });
  const html = await res.text();

  const jogos = [];
  // Regex para capturar o padrão: HH:HH – Time A x Time B – Campeonato
  // seguido de Canais: ...
  const blocoRegex = /###\s+\*\*(\d{1,2}h\d{2})\s*[–-]\s*(.+?)\s*[–-]\s*(.+?)\*\*[\s\S]*?\*\*Canais?:\s*(.+?)\*\*/gi;

  let match;
  while ((match = blocoRegex.exec(html)) !== null) {
    const time = match[1].trim();
    const teams = match[2].trim();
    const league = match[3].trim();
    const tv = match[4].trim().replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    jogos.push({ time, teams, league, tv });
  }

  // fallback: tenta capturar via headings HTML se markdown não funcionar
  if (jogos.length === 0) {
    const h3Regex = /<h3[^>]*>\s*<strong>(\d{1,2}h\d{2})\s*[–-]\s*(.+?)\s*[–-]\s*(.+?)<\/strong>\s*<\/h3>[\s\S]*?<strong>Canais?:\s*(.*?)<\/strong>/gi;
    while ((match = h3Regex.exec(html)) !== null) {
      jogos.push({
        time: match[1].trim(),
        teams: match[2].trim(),
        league: match[3].trim(),
        tv: match[4].replace(/<[^>]+>/g, '').trim()
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

    res.status(200).json({
      hoje,
      amanha,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
