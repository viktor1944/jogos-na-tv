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
      return {
        dd: String(brt.getDate()).padStart(2,'0'),
        mm: String(brt.getMonth()+1).padStart(2,'0')
      };
    }

    var today    = getBRT(0);
    var tomorrow = getBRT(1);
    var after    = getBRT(2);

    var todayKey    = today.dd    + '/' + today.mm;
    var tomorrowKey = tomorrow.dd + '/' + tomorrow.mm;
    var afterKey    = after.dd    + '/' + after.mm;

    var blocosHoje   = dividirPorHeadingData(h1);
    var blocosAmanha = dividirPorHeadingData(h2);

    var jogosHoje   = blocosHoje[todayKey]      || [];
    var jogosAmanha = blocosAmanha[tomorrowKey] || [];
    var jogosDepois = blocosAmanha[afterKey]    || [];

    if (jogosHoje.length === 0)   jogosHoje   = extrair(h1);
    if (jogosAmanha.length === 0) jogosAmanha = extrair(h2);

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

// Procura SOMENTE headings de data: tags h1/h2/h3/h4 ou strong/b
// que contenham padrão "DiaDaSemana – DD/MM" ou apenas "DD/MM"
// Divide o HTML em blocos e mapeia { "08/05": [jogos], "09/05": [jogos] }
function dividirPorHeadingData(html) {
  var resultado = {};

  // Padrão específico: procura a data DENTRO de tags de heading
  // Exemplos que o site usa:
  //   <h2 ...>Sexta &#8211; 08/05</h2>
  //   <h2 ...>Sábado &#8211; 09/05</h2>
  //   <strong>Quinta – 07/05</strong>
  // O traço pode ser – (U+2013), &#8211; ou -
  var reHeading = /<(?:h[1-6]|strong|b)[^>]*>[^<]*(?:–|&#8211;|-)\s*(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])(?:\/\d{4})?[^<]*<\/(?:h[1-6]|strong|b)>/gi;

  var sections = [];
  var m;

  while ((m = reHeading.exec(html)) !== null) {
    var dd  = m[1];
    var mm  = m[2];
    var key = dd + '/' + mm;

    var last = sections[sections.length - 1];
    if (last && last.key === key) continue;

    sections.push({ key: key, start: m.index });
  }

  // fallback: se não achou headings com traço, tenta só DD/MM isolado em tag
  if (sections.length === 0) {
    var reFallback = /<(?:h[1-6]|strong|b)[^>]*>[^<]*(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])(?:\/\d{4})?[^<]*<\/(?:h[1-6]|strong|b)>/gi;
    while ((m = reFallback.exec(html)) !== null) {
      var dd2  = m[1];
      var mm2  = m[2];
      var key2 = dd2 + '/' + mm2;
      var last2 = sections[sections.length - 1];
      if (last2 && last2.key === key2) continue;
      sections.push({ key: key2, start: m.index });
    }
  }

  if (sections.length === 0) return {};

  // define fim de cada seção
  for (var i = 0; i < sections.length; i++) {
    sections[i].end = (i + 1 < sections.length)
      ? sections[i + 1].start
      : html.length;
  }

  // extrai jogos de cada bloco
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
  var l = league.trim();

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
