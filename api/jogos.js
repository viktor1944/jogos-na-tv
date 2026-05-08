module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  try {
    var headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };

    // Busca as 3 páginas separadamente
    var r1 = await fetch('https://mantosdofutebol.com.br/guia-de-jogos-tv-hoje-ao-vivo/', { headers });
    var r2 = await fetch('https://mantosdofutebol.com.br/jogos-de-amanha-tv/', { headers });
    var r3 = await fetch('https://mantosdofutebol.com.br/jogos-de-depois-de-amanha-na-tv/', { headers });
    var h1 = await r1.text();
    var h2 = await r2.text();
    var h3 = r3.ok ? await r3.text() : '';

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

    // Divide cada página pelos headings de data
    var blocosHoje   = dividirPorHeadingData(h1);
    var blocosAmanha = dividirPorHeadingData(h2);
    var blocosDepois = h3 ? dividirPorHeadingData(h3) : {};

    var jogosHoje   = blocosHoje[todayKey]      || [];
    var jogosAmanha = blocosAmanha[tomorrowKey] || [];
    var jogosDepois = blocosDepois[afterKey]    || blocosAmanha[afterKey] || [];

    // fallbacks
    if (jogosHoje.length === 0)   jogosHoje   = extrairSoPrimeiroDia(h1);
    if (jogosAmanha.length === 0) jogosAmanha = extrairSoPrimeiroDia(h2);
    if (jogosDepois.length === 0 && h3) jogosDepois = extrairSoPrimeiroDia(h3);

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
        datasAmanha: Object.keys(blocosAmanha),
        datasDepois: Object.keys(blocosDepois),
        paginaDepoisOk: r3.ok
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Divide HTML em blocos por heading de data
// Procura padrões como: "Sexta – 08/05", "Sábado – 09/05", "08/05"
// dentro de tags h1-h6, strong, b, p
function dividirPorHeadingData(html) {
  var resultado = {};

  // Remove tags internas para limpar o texto dos headings
  // Procura por: qualquer tag que contenha DD/MM precedido opcionalmente por texto e traço
  // O traço pode ser: –  &#8211;  &ndash;  \u2013  -
  var reHeading = /<(h[1-6]|strong|b|p)[^>]*>((?:[^<]|<(?!\/\1))*?)(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])(?:\/\d{2,4})?((?:[^<]|<(?!\/\1))*?)<\/\1>/gi;

  var sections = [];
  var m;

  while ((m = reHeading.exec(html)) !== null) {
    var fullText = m[0].replace(/<[^>]+>/g, ''); // remove tags internas
    // só considera se parecer um heading de data (tem dia da semana OU está sozinho)
    // e não contém muitas palavras (não é um parágrafo de texto)
    if (fullText.length > 60) continue; // headings de data são curtos

    var dd  = m[3];
    var mm  = m[4];
    var key = dd + '/' + mm;

    var last = sections[sections.length - 1];
    if (last && last.key === key) continue;

    sections.push({ key: key, start: m.index });
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

// Fallback: pega só os jogos antes do primeiro heading de data diferente
function extrairSoPrimeiroDia(html) {
  // Procura o segundo heading de data (seria o segundo dia)
  var reHeading = /<(?:h[1-6]|strong|b)[^>]*>[^<]*(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])(?:\/\d{2,4})?[^<]*<\/(?:h[1-6]|strong|b)>/gi;
  var count = 0;
  var m;
  var cutAt = html.length;

  while ((m = reHeading.exec(html)) !== null) {
    count++;
    if (count === 2) { cutAt = m.index; break; }
  }

  return extrair(html.substring(0, cutAt));
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
