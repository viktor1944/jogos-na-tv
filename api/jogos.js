function extrair(html) {
  const jogos = [];

  const sep = '(?:&#8211;|–|-)';
  const re = new RegExp(
    `<h3[^>]*>\\s*<strong>(\\d{1,2}h\\d{2})\\s*${sep}\\s*(.+?)\\s*${sep}\\s*([^<]+?)<\\/strong>\\s*<\\/h3>[\\s\\S]{0,400}?<strong>Canais?:\\s*(.+?)<\\/strong>`,
    'gi'
  );

  let m;
  while ((m = re.exec(html)) !== null) {
    const time = m[1].trim();
    const teams = m[2].trim();
    let league = m[3].replace(/<[^>]+>/g, '').trim();
    const tv = m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    // Se a liga contém " x " provavelmente é o time que foi partido — junta tudo como times e pega a última parte como liga
    if (league.toLowerCase().includes(' x ')) {
      // O campo teams na verdade é só parte do time, e league tem o resto + liga
      // Tenta separar pelo último travessão
      const full = teams + ' – ' + league;
      const lastDash = full.lastIndexOf('–');
      if (lastDash > 0) {
        const realTeams = full.substring(0, lastDash).trim();
        const realLeague = full.substring(lastDash + 1).trim();
        jogos.push({ time, teams: realTeams, league: realLeague, tv });
        continue;
      }
    }

    jogos.push({ time, teams, league, tv });
  }

  return jogos;
}
