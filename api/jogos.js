module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };

    const r1 = await fetch('https://mantosdofutebol.com.br/guia-de-jogos-tv-hoje-ao-vivo/', { headers });
    const r2 = await fetch('https://mantosdofutebol.com.br/jogos-de-amanha-tv/', { headers });
    const h1 = await r1.text();
    const h2 = await r2.text();

    res.status(200).json({
      hoje: extrair(h1),
      amanha: extrair(h2),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function extrair(html) {
  var jogos = [];
  var sep = '(?:&#8211;|&#8212;|-)';
  var pattern = '<h3[^>]*>\\s*<strong>(\\d{1,2}h\\d{2})\\s*' + sep + '\\s*(.+?)\\s*' + sep + '\\s*([^<]+?)<\\/strong>\\s*<\\/h3>[\\s\\S]{0,400}?<strong>Canais?:\\s*(.+?)<\\/strong>';
  var re = new RegExp(pattern, 'gi');
  var m;

  while ((m = re.exec(html)) !== null) {
    var time = m[1].trim();
    var teams = m[2].trim();
    var league = m[3].replace(/<[^>]+>/g, '').trim();
    var tv = m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    if (league.indexOf(' x ') !== -1) {
      var full = teams + ' - ' + league;
      var lastDash = full.lastIndexOf(' - ');
      if (lastDash > 0) {
        teams = full.substring(0, lastDash).trim();
        league = full.substring(lastDash + 3).trim();
      }
    }

    jogos.push({ time: time, teams: teams, league: league, tv: tv });
  }

  return jogos;
}
