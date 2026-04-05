export function formatCompetencia(competencia: string) {
  if (!competencia) return ""

  const [ano, mes] = competencia.split("-")
  return `${mes}/${ano}`
}