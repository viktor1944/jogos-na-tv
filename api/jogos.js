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

    // Datas em horário de Brasília (UTC-3)
    var now = new Date();
    var brtOffset = -3 * 60; // minutos
    var brtNow = new Date(now.getTime() + (brtOffset - now.getTimezoneOffset()) * 60000);

    function pad(n){ return String(n).padStart(2,'0'); }

    var todayDD   = pad(brtNow.getDate());
    var todayMM   = pad(brtNow.getMonth()+1);
    var todayStr  = todayDD + '/' + todayMM;

    var tomDate = new Date(brtNow); tomDate.setDate(brtNow.getDate()+1);
    var tomorrowStr = pad(tomDate.getDate()) + '/' + pad(tomDate.getMonth()+1);

    var aftDate = new Date(brtNow); aftDate.setDate(brtNow.getDate()+2);
    var afterStr = pad(aftDate.getDate()) + '/' + pad(aftDate.getMonth()+1);

    // Extrai todos os blocos de data do HTML e os jogos de cada bloco
    // Retorna apenas jogos da data solicitada
    var jogosHoje   = extrairPorData(h1, todayStr);
    var jogosAmanha = extrairPorData(h2, tomorrowStr);
    var jogosDepois = extrairPorData(h2, afterStr);

    // Fallbacks: se não achou por data, tenta extração simples
    if(jogosHoje.length === 0)   jogosHoje   = extrair(h1);
    if(jogosAmanha.length === 0) jogosAmanha = extrair(h2);

    res.status(200).json({
      hoje:      jogosHoje,
      amanha:    jogosAmanha,
      depois:    jogosDepois,
      updatedAt: new Date().toISOString(),
      debug: { todayStr, tomorrowStr, afterStr }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function pad(n){ return String(n).padStart(2,'0'); }

// Divide o HTML em seções por data e retorna só os jogos da data pedida
function extrairPorData(html, wantedDate) {
  // Procura padrões de data: DD/MM ou DD/MM/YYYY no HTML
  // O site coloca datas assim: "07/05" ou "07/05/2026"
  var dateTagPattern = /(\d{2}\/\d{2})(?:\/\d{4})?/g;
  
  // Coleta todas as ocorrências de datas e suas posições
  var dateSections = [];
  var m;
  while ((m = dateTagPattern.exec(html)) !== null) {
    var dateFound = m[1]; // DD/MM
    // evita duplicatas consecutivas
    if (dateSections.length === 0 || dateSections[dateSections.length-1].date !== dateFound) {
      dateSections.push({ date: dateFound, start: m.index });
    }
  }

  if (dateSections.length === 0) return [];

  // Define o bloco de cada seção
  for (var i = 0; i < dateSections.length; i++) {
    dateSections[i].end = (i+1 < dateSections.length) ? dateSections[i+1].start : html.length;
  }

  // Pega o bloco da data pedida
  var resultado = [];
  for (var j = 0; j < dateSections.length; j++) {
    if (dateSections[j].date === wantedDate) {
      var bloco = html.substring(dateSections[j].start, dateSections[j].end);
      resultado = resultado.concat(extrair(bloco));
    }
  }

  return resultado;
}

function cleanLeague(league) {
  if(!league) return league;
  var l = league.trim();

  var paren = l.match(/(\s*\(.*?\)\s*)$/);
  var suffix = paren ? paren[1].trim() : '';
  var base = paren ? l.slice(0, l.length - paren[1].length).trim() : l;
  var b = base.toLowerCase();

  var map = [
    ['conmebol libertadores de futebol de areia', 'Libertadores de Futebol de Areia'],
    ['conmebol libertadores',                      'Libertadores'],
    ['conmebol sul-americana',                     'Sul-Americana'],
    ['conmebol sudamericana',                      'Sul-Americana'],
    ['uefa champions league',                      'Champions League'],
    ['uefa europa league',                         'Europa League'],
    ['uefa conference league',                     'Conference League'],
    ['uefa nations league',                        'Nations League'],
    ['fifa world cup',                             'Copa do Mundo'],
    ['fifa club world cup',                        'Mundial de Clubes'],
    ['copa conmebol libertadores',                 'Libertadores'],
  ];

  for(var i=0;i<map.length;i++){
    if(b === map[i][0]){
      var inner = suffix.replace(/[()]/g,'').trim();
      return map[i][1] + (inner ? ' ('+inner+')' : '');
    }
  }

  return l;
}

function extrair(html) {
  var jogos = [];
  var pattern = '<h3[^>]*>\\s*<strong>(\\d{1,2}h\\d{2})(.+?)<\\/strong>\\s*<\\/h3>[\\s\\S]{0,400}?<strong>Canais?:\\s*(.+?)<\\/strong>';
  var re = new RegExp(pattern, 'gi');
  var m;

  while ((m = re.exec(html)) !== null) {
    var time   = m[1].trim();
    var titulo = m[2].replace(/<[^>]+>/g, '').trim();
    var tv     = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    var partes = titulo.split('&#8211;');
    if (partes.length === 1) partes = titulo.split('\u2013');

    var league, teams;
    if (partes.length >= 2) {
      league = partes[partes.length - 1].trim();
      teams  = partes.slice(0, partes.length - 1).join('\u2013').trim();
    } else {
      league = 'Outros';
      teams  = titulo.trim();
    }

    teams  = teams.replace(/^\s*[-\u2013]\s*/, '').trim();
    league = league.replace(/\s*[-\u2013]\s*$/, '').trim();
    league = cleanLeague(league);

    if (teams) jogos.push({ time, teams, league, tv });
  }

  return jogos;
}
