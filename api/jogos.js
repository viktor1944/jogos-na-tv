module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    };

    const [r1, r2] = await Promise.all([
      fetch('https://mantosdofutebol.com.br/guia-de-jogos-tv-hoje-ao-vivo/', { headers }),
      fetch('https://mantosdofutebol.com.br/jogos-de-amanha-tv/', { headers })
    ]);

    const [h1, h2] = await Promise.all([r1.text(), r2.text()]);

    res.status(200).json({
      hoje: extrair(h1),
      amanha: extrair(h2),
      updatedAt: new Date().toISOString(),
      debug_h1_len: h1.length,
      debug_h2_len: h2.length,
      debug_h1_sample: h1.substring(0, 500)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function extrair(html) {
  const jogos = [];

  // tenta padrão HTML: <h3><strong>HHh
