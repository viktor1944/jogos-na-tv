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

    // Data de hoje no formato DD/MM
    var now = new Date();
    var todayStr = String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0');
    var tomorrowDate = new Date(now); tomorrowDate.setDate(now.getDate()+1);
    var tomorrowStr = String(tomorrowDate.getDate()).padStart(2,'0') + '/' + String(tomorrowDate.getMonth()+1).padStart(2,'0');
    var afterDate = new Date(now); afterDate.setDate(now.getDate()+2);
    var afterStr = String(afterDate.getDate()).padStart(2,'0') + '/' + String(afterDate.getMonth()+1).padStart(2,'0');

    var jogosHoje = extrairComData(h1, todayStr);
    var rawAmanha = extrairComData(h2, tomorrowStr);
    var rawDepois = extrairComData(h2, afterStr);

    // fallback: se extrairComData não encontrou nada por data, usa extração simples
    if(jogosHoje.length === 0) jogosHoje = extrair(h1);
    if(rawAmanha.length === 0 && rawDepois.length === 0) {
      var todos = extrair(h2);
      // divide pelo salto de horário
      rawAmanha = todos;
      rawDepois = [];
    }

    res.status(200).json({
      hoje: jogosHoje,
      amanha: rawAmanha,
      depois: rawDepois,
      updatedAt: new Date().toISOString(),
      debug: { todayStr: todayStr, tomorrowStr: tomorrowStr, afterStr: afterStr }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Extrai jogos de uma seção específica de data (DD/MM)
function extrairComData(html, dateStr) {
  var jogos = [];

  // Procura pelo padrão de data no HTML: pode aparecer como "05/05" ou "Segunda-feira, 05/05/2026"
  var datePattern = new RegExp(dateStr.replace('/','\\/'), 'g');
  var dateIdx = html.search(datePattern);
  if(dateIdx === -1) return [];

  // Pega o bloco a partir da data encontrada
  // Procura a próxima data diferente para saber onde termina
  var nextDatePattern = /\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{2}/g;
  nextDatePattern.lastIndex = dateIdx + dateStr.length;
  var nextMatch = nextDatePattern.exec(html);
  var endIdx = nextMatch ? nextMatch.index : html.length;

  // Se a próxima data encontrada for a mesma, continua
  while(nextMatch && nextMatch[0].indexOf(dateStr) !== -1) {
    nextMatch = nextDatePattern.exec(html);
    endIdx = nextMatch ? nextMatch.index : html.length;
  }

  var bloco = html.substring(dateIdx, endIdx);
  return extrair(bloco);
}

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

    var now = new Date();
    var todayStr = pad(now.getDate()) + '/' + pad(now.getMonth()+1);
    var tom = new Date(now); tom.setDate(now.getDate()+1);
    var tomorrowStr = pad(tom.getDate()) + '/' + pad(tom.getMonth()+1);
    var aft = new Date(now); aft.setDate(now.getDate()+2);
    var afterStr = pad(aft.getDate()) + '/' + pad(aft.getMonth()+1);

    function pad(n){ return String(n).padStart(2,'0'); }

    var jogosHoje = extrairComData(h1, todayStr);
    var jogosAmanha = extrairComData(h2, tomorrowStr);
    var jogosDepois = extrairComData(h2, afterStr);

    if(jogosHoje.length === 0) jogosHoje = extrair(h1);
    if(jogosAmanha.length === 0 && jogosDepois.length === 0) {
      jogosAmanha = extrair(h2);
    }

    res.status(200).json({
      hoje: jogosHoje,
      amanha: jogosAmanha,
      depois: jogosDepois,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function pad(n){ return String(n).padStart(2,'0'); }

function cleanLeague(league) {
  if(!league) return league;
  var l = league.trim();
  // Mapeamento de nomes
  var map = [
    [/^CONMEBOL Libertadores de Futebol de Areia$/i, 'Libertadores de Futebol de Areia'],
    [/^CONMEBOL Libertadores$/i, 'Libertadores'],
    [/^CONMEBOL Sul-Americana$/i, 'Sul-Americana'],
    [/^CONMEBOL Sudamericana$/i, 'Sul-Americana'],
    [/^UEFA Champions League$/i, 'Champions League'],
    [/^UEFA Europa League$/i, 'Europa League'],
    [/^UEFA Conference League$/i, 'Conference League'],
    [/^FIFA Club World Cup$/i, 'Mundial de Clubes'],
    [/^Copa CONMEBOL Libertadores/i, 'Libertadores'],
  ];
  // testa sem parênteses
  var base = l.replace(/\s*\(.*?\)/g,'').trim();
  for(var i=0;i<map.length;i++){
    if(map[i][0].test(base)){
      // recoloca parênteses se tinha
      var paren = l.match(/\(.*?\)/);
      return map[i][1] + (paren ? ' '+paren[0] : '');
    }
  }
  return l;
}

function extrairComData(html, dateStr) {
  var datePattern = new RegExp(dateStr.replace('/','\\/'));
  var dateIdx = html.search(datePattern);
  if(dateIdx === -1) return [];

  var nextDatePattern = /\d{2}\/\d{2}/g;
  nextDatePattern.lastIndex = dateIdx + dateStr.length + 1;
  var nextMatch;
  var endIdx = html.length;
  while((nextMatch = nextDatePattern.exec(html)) !== null) {
    if(nextMatch[0] !== dateStr) { endIdx = nextMatch.index; break; }
  }

  return extrair(html.substring(dateIdx, endIdx));
}

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
    league = cleanLeague(league);

    if (teams) jogos.push({ time: time, teams: teams, league: league, tv: tv });
  }

  return jogos;
}
  return jogos;
}
