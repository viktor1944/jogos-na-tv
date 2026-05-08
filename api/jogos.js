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

    // Divide o HTML em blocos usando os headings de data como separadores
    // Funciona com qualquer data, qualquer dia da semana
    var blocosHoje   = dividir(h1);
    var blocosAmanha = dividir(h2);

    // Pega os jogos da data correta de cada página
    // Se não achar a data, pega o primeiro bloco disponível como fallback
    var jogosHoje   = blocosHoje[todayKey]      || primeiroBloco(blocosHoje)   || [];
    var jogosAmanha = blocosAmanha[tomorrowKey] || primeiroBloco(blocosAmanha) || [];
    var jogosDepois = blocosAmanha[afterKey]    || [];

    res.status(200).json({
      hoje:      jogosHoje,
      amanha:    jogosAmanha,
      depois:    jogosDepois,
      updatedAt: new Date().toISOString(),
      debug: {
        todayKey,
        tomorrowKey,
        afterKey,
        datasHoje:   Object.keys(blocosHoje),
        datasAmanha: Object.keys(blocosAmanha)
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function primeiroBloco(blocos) {
  var keys = Object.keys(blocos);
  return keys.length > 0 ? blocos[keys[0]] : null;
}

// Divide o HTML pelos headings de data
// O site usa: <h2>Quinta &#8211; 07/05</h2> ou similar
// Estratégia: acha todas as ocorrências de DD/MM que estão
// DENTRO de tags de heading (h1-h4) e usa como separadores
function dividir(html) {
  var resultado = {};

  // Acha headings que contêm datas
  // Padrão: <h1..h4> ... DD/MM ... </h1..h4>
  // O &#8211; é o – em HTML entity
  var reH = /<h[1-4][^>]*>[\s\S]*?(\d{2})\/(\d{2})[\s\S]*?<\/h[1-4]>/gi;
  var sections = [];
  var m;

  while ((m = reH.exec(html)) !== null) {
    var dd  = m[1];
    var mm  = m[2];

    // valida: mês entre 01-12, dia entre 01-31
    if (parseInt(mm) < 1 || parseInt(mm) > 12) continue;
    if (parseInt(dd) < 1 || parseInt(dd) > 31) continue;

    var key  = dd + '/' + mm;
    var last = sections[sections.length - 1];
    if (last && last.key === key) continue;

    sections.push({ key: key, start: m.index });
  }

  if (sections.length === 0) {
    // Não achou nenhum heading com data
    // Retorna tudo como bloco único sem chave de data
    return { '__sem_data__': extrair(html) };
  }

  // Define o fim de cada seção
  for (var i = 0; i < sections.length; i++) {
    sections[i].end = (i + 1 < sections.length)
      ? sections[i + 1].start
      : html.length;
  }

  // Extrai jogos de cada bloco
  for (var j = 0; j < sections.length; j++) {
    var s     = sections[j];
    var bloco = html.substring(s.start, s.end);
    var jogos = extrair(bloco);
    if (!resultado[s.key]) resultado[s.key] = [];
    resultado[s.key] = resultado[s.key].concat(jogos);
  }

  return resultado;
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
