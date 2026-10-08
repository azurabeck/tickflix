# actions/movies/majorreleases

**Página/ciclo:** `movies` → `majorreleases`

Section "Principais lançamentos": pega a fatia "releases" do dashboard (com o loading dela). usado em: presentation/cyclerender, página Filmes

## Funções (na ordem em que o ciclo acontece)
- `useMajorReleases` — Section "Principais lançamentos": pega a fatia "releases" do dashboard (com o loading dela). usado em: presentation/cyclerender, página Filmes
- `monthLabel` — "Outubro de 2026" a partir de `2026-10`, no idioma do app. usado em: MajorReleasesSection
- `releaseMonths` — Os últimos meses que têm lançamento, do mais recente pro mais antigo. usado em: presentation/cyclefilters, MajorReleasesSection
- `releasesOfMonth` — Lançamentos de um mês, no limite de uma fileira. usado em: presentation/cyclefilters, MajorReleasesSection
- `groupByMonth` — Agrupa por mês (mais recente primeiro) mantendo a ordem original dentro de cada mês. usado em: MajorReleasesModal
