export const PAYMENT_MONTHS = [
  { value: 1, label: "JAN" },
  { value: 2, label: "FEV" },
  { value: 3, label: "MAR" },
  { value: 4, label: "ABR" },
  { value: 5, label: "MAI" },
  { value: 6, label: "JUN" },
  { value: 7, label: "JUL" },
  { value: 8, label: "AGO" },
  { value: 9, label: "SET" },
  { value: 10, label: "OUT" },
  { value: 11, label: "NOV" },
  { value: 12, label: "DEZ" },
]

export function formatCurrency(value?: number | null) {
  if (value == null) return "-"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}


export function getCompetencia(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`
}

export function formatCompetencia(competencia?: string | null) {
  if (!competencia) return "-"

  const [ano, mes] = competencia.split("-")

  if (!ano || !mes) return competencia

  return `${mes}/${ano}`
}


export function parseCompetenciaToApi(value?: string | null) {
  if (!value) return null

  const cleaned = value.trim()

  const match = cleaned.match(/^(\d{2})\/(\d{4})$/)

  if (!match) return null

  const [, mes, ano] = match

  return `${ano}-${mes}`
}

export function getStatusClass(status?: string | null) {
  switch (status) {
    case "PAGO":
      return "bg-green-100 text-green-700"
    case "PENDENTE":
      return "bg-yellow-100 text-yellow-700"
    case "ATRASADO":
      return "bg-red-100 text-red-700"
    default:
      return "bg-gray-100 text-gray-400"
  }
}

export function getStatusLabel(status?: string | null) {
  switch (status) {
    case "PAGO":
      return "Pago"
    case "PENDENTE":
      return "Pendente"
    case "ATRASADO":
      return "Atrasado"
    default:
      return "-"
  }
}