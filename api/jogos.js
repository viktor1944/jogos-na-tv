module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };

    const r1 = await fetch('https://mantosdofutebol.com.br/jogos-de-amanha-tv/', { headers });
    const h1 = await r1.text();

    // procura onde aparece "h30" ou "h00" ou "Canais" no HTML
    const idx1 = h1.indexOf('Canais');
    const idx2 = h1.indexOf('h30');
    const idx3 = h1.indexOf('<h3');

    res.status(200).json({
      tamanho: h1.length,
      idx_canais: idx1,
      idx_h30: idx2,
      idx_h3tag: idx3,
      trecho_canais: idx1 > 0 ? h1.substring(idx1 - 200, idx1 + 200) : 'nao encontrado',
      trecho_h3: idx3 > 0 ? h1.substring(idx3, idx3 + 400) : 'nao encontrado'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
