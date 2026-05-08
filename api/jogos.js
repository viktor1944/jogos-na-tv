module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  try {
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };

    var r1 = await fetch('https://mantosdofutebol.com.br/guia-de-jogos-tv-hoje-ao-vivo/', { headers });
    var r2 = await fetch('https://mantosdofutebol.com.br/jogos-de-amanha-tv/', { headers });
    var h1 = await r1.text();
    var h2 = await r2.text();

    function getBRT(offsetDays) {
      var now = new Date();
      var brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      brt.setDate(brt.getDate() + (offsetDays || 0));
      return String(brt.getDate()).padStart(2,'0') + '/' + String(brt.getMonth()+1).padStart(2,'0');
    }

    var todayKey    = getBRT(0);
    var tomorrowKey = getBRT(1);
    var afterKey    = getBRT(2);

    // Extrai todos os jogos e separa pelo salto de horário
    // Quando os horários voltam muito para trás (ex: de 23h para 03h), virou o dia
    var todosHoje   = extrair(h1);
    var todosAmanha = extrair(h2);

    var cortadoHoje   = cortarPorDia(todosHoje);
    var cortadoAmanha = cortarPorDia(todosAmanha);

    res.status(200).json({
      hoje:      cortadoHoje[0]   || [],
      amanha:    cortadoAmanha[0] || [],
      depois:    cortadoAmanha[1] || [],
      updatedAt: new Date().toISOString(),
      debug: {
        todayKey, tomorrowKey, afterKey,
        qtdDiasHoje:   cortadoHoje.length,
        qtdDiasAmanha: cortadoAmanha.length,
        primeiroHoje:   cortadoHoje[0]   ? cortadoHoje[0][0]   : null,
        primeiroAmanha: cortadoAmanha[0] ? cortadoAmanha[0][0] : null,
        primeiroDepois: cortadoAmanha[1] ? cortadoAmanha[1][0] : null
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Divide lista de jogos em grupos de dias
// Detecta virada de dia quando o horário cai mais de 3 horas em relação ao anterior
function cortarPorDia(jogos) {
  if (!jogos.length) return [[]];

  var grupos = [];
  var grupoAtual = [];
  var minAnterior = toMin(jogos[0].time);

  for (var i = 0; i < jogos.length; i++) {
    var min = toMin(jogos[i].time);
    // Se o horário caiu mais de 180 minutos (3h), virou o dia
    if (i > 0 && min < minAnterior - 180) {
      grupos.push(grupoAtual);
      grupoAtual = [];
    }
    grupoAtual.push(jogos[i]);
    // só atualiza minAnterior se subiu (não deixa cair por horários iguais)
    if (min >= minAnterior) minAnterior = min;
  }

  if (grupoAtual.length > 0) grupos.push(grupoAtual);
  return grupos;
}

function toMin(t) {
  if (!t) return 0;
  var p = t.replace('h', ':').split(':');
  return parseInt(p[0]) * 60 + parseInt(p[1] || 0);
}

function cleanLeague(league) {
  if (!league) return league;
  var l      = league.trim();
  var paren  = l.match(/(\s*\(.*?\)\s*)$/);
  var suffix = paren ? paren[1].trim() : '';
  var base   = paren ? l.slice(0, l.length - paren[1].length).trim() : l;
  var b      = base.toLowerCase();
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
  for (var i = 0; i < map.length; i++) {
    if (b === map[i][0]) {
      var inner = suffix.replace(/[()]/g, '').trim();
      return map[i][1] + (inner ? ' (' + inner + ')' : '');
    }
  }
  return l;
}

function extrair(html) {
  var jogos   = [];
  var pattern = '<h3[^>]*>\\s*<strong>(\\d{1,2}h\\d{2})(.+?)<\\/strong>\\s*<\\/h3>[\\s\\S]{0,400}?<strong>Canais?:\\s*(.+?)<\\/strong>';
  var re      = new RegExp(pattern, 'gi');
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
