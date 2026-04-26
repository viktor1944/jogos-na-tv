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

    // retorna pedaço do HTML pra ver o que está chegando
    res.status(200).json({
      status: r1.status,
      tamanho: h1.length,
      trecho1: h1.substring(0, 300),
      trecho2: h1.substring(1000, 1500),
      trecho3: h1.substring(3000, 3500)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
