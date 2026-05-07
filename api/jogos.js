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

    // Horário de Brasília (UTC-3)
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

    var jogosHoje   = extrairPorData(h1, today.dd,    today.mm);
    var jogosAmanha = extrairPorData(h2, tomorrow.dd, tomorrow.mm);
    var jogosDepois = extrairPorData(h2, after.dd,    after.mm);

    // fallback se não encontrou por data
    if (jogosHoje.length === 0)   jogosHoje   = extrair(h1);
    if (jogosAmanha.length === 0) jogosAmanha = extrair(h2);

    res.status(200).json({
      hoje:      jogosHoje,
      amanha:    jogosAmanha,
      depois:    jogosDepois,
      updatedAt: new Date().toISOString(),
      debug: {
        brtToday:    today.dd+'/'+today.mm,
        brtTomorrow: tomorrow.dd+'/'+tomorrow.mm,
        brtAfter:    after.dd+'/'+after.mm
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Divide o HTML em seções por heading de data ("Quinta – 07/05" ou "07/05")
// e retorna só os jogos da seção que bate com DD/MM pedido
function extrairPorData(html, dd, mm) {
  var wanted = dd + '/' + mm;

  // Padrão que captura headings de data como:
  // <h2...>Quinta – 07/05</h2>  ou  <h3...>07/05/2026</h3>  ou qualquer tag com a data
  // Captura a posição de cada ocorrência de DD/MM no HTML
  var reDate = /\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/g;

  var sections = [];
  var m;
  while ((m = reDate.exec(html)) !== null) {
    var fdd = m[1].padStart(2,'0');
    var fmm = m[2].padStart(2,'0');

    // ignora datas que claramente são horas (ex: 19/00 não existe como mês)
    if (parseInt(fmm) > 12) continue;
    // ignora dias impossíveis
    if (parseInt(fdd) > 31) continue;

    var last = sections[sections.length - 1];
    if (!last || last.dd !== fdd || last.mm !== fmm) {
      sections.push({ dd: fdd, mm: fmm, start: m.index });
    }
  }

  if (sections.length === 0) return [];

  // define o fim de cada seção
  for (var i = 0; i < sections.length; i++) {
    sections[i].end = (i + 1 < sections.length) ? sections[i+1].start : html.length;
  }

  // extrai só as seções que batem com a data pedida
  var resultado = [];
  for (var j = 0; j < sections.length; j++) {
    var s = sections[j];
    if (s.dd === dd && s.mm === mm) {
      resultado = resultado.concat(extrair(html.substring(s.start, s.end)));
    }
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
