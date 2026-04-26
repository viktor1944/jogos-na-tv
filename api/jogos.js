async function fetchJogos(url) {
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy);
  const data = await res.json();
  const html = data.contents || '';

  const jogos = [];
  const regex = /<h3[^>]*>\s*<strong>(\d{1,2}h\d{2})\s*[–\-]\s*(.+?)\s*[–\-]\s*(.+?)<\/strong>\s*<\/h3>[\s\S]*?<strong>Canais?:\s*(.*?)<\/strong>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    jogos.push({
      time: match[1].trim(),
      teams: match[2].trim(),
      league: match[3].trim(),
      tv: match[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    });
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
