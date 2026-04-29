module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  try {
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };

    var r1 = await fetch('https://mantosdofutebol.com.br/guia-de-jogos-tv-hoje-ao-vivo/', { headers: headers });
    var r2 = await fetch('https://mantosdofutebol.com.br/jogos-de-amanha-tv/', { headers: headers });
    var h1 = await r1.text();
    var h2 = await r2.text();

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
  var pattern = '<h3[^>]*>\\s*<strong>(\\d{1,2}h\\d{2})(.+?)<\\/strong>\\s*<\\/h3>[\\s\\S]{0,400}?<strong>Canais?:\\s*(.+?)<\\/strong>';
  var re = new RegExp(pattern, 'gi');
  var m;

  while ((m = re.exec(html)) !== null) {
    var time = m[1].trim();
    var titulo = m[2].replace(/<[^>]+>/g, '').trim();
    var tv = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    var partes = titulo.split('&#8211;');
    if (partes.length === 1) partes = titulo.split('\u2013');

    var league, teams;
    if (partes.length >= 2) {
      league = partes[partes.length - 1].trim();
      teams = partes.slice(0, partes.length - 1).join('\u2013').trim();
    } else {
      league = 'Outros';
      teams = titulo.trim();
    }

    teams = teams.replace(/^\s*[-\u2013]\s*/, '').trim();
    league = league.replace(/\s*[-\u2013]\s*$/, '').trim();

    if (teams) jogos.push({ time: time, teams: teams, league: league, tv: tv });
  }

  return jogos;
}
