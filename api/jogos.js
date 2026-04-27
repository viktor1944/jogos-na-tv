module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };

    const fetchComTimeout = (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      return fetch(url, { headers, signal: controller.signal })
        .finally(() => clearTimeout(timeout));
    };

    const [r1, r2] = await Promise.all([
      fetchComTimeout('https://mantosdofutebol.com.br/guia-de-jogos-tv-hoje-ao-vivo/'),
      fetchComTimeout('https://mantosdofutebol.com.br/jogos-de-amanha-tv/')
    ]);

    const [h1, h2] = await Promise.all([r1.text(), r2.text()]);

    res.status(200).json({
      hoje: extrair(h1),
      amanha: extrair(h2),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message, type: err.name });
  }
};

function extrair(html) {
  const jogos = [];
  const sep = '(?:&#8211;|\u2013|-)';
  const re = new RegExp(
    '<h3[^>]*>\\s*<strong>(\\d{1,2}h\\d{2})\\s*' + sep + '\\s*(.+?)\\s*' + sep + '\\s*([^<]+?)<\\/strong>\\s*<\\/h3>[\\s\\S]{0,400}?<strong>Canais?:\\s*(.+?)<\\/strong>',
    'gi'
  );

  let m;
  while ((m = re.exec(html)) !== null) {
    const time = m[1].trim();
    let teams = m[2].trim();
    let league = m[3].replace(/<[^>]+>/g, '').trim();
    const tv = m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    if (league.toLowerCase().includes(' x ')) {
      const full = teams + ' \u2013 ' + league;
      const lastDash = full.lastIndexOf('\u2013');
      if (lastDash > 0) {
        teams = full.substring(0, lastDash).trim();
        league = full.substring(lastDash + 1).trim();
      }
    }

    jogos.push({ time, teams, league, tv });
  }

  return jogos;
}
