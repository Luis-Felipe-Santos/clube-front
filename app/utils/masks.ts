export function onlyNumbers(value: string): string {
  return value.replace(/\D/g, "")
}

export function maskCpf(value: string): string {
  const numbers = onlyNumbers(value).slice(0, 11)

  return numbers
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2")
}

export function maskCnpj(value: string): string {
  const numbers = onlyNumbers(value).slice(0, 14)

  return numbers
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

export function maskPhone(value: string): string {
  const numbers = onlyNumbers(value).slice(0, 11)

  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }

  return numbers
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
}

export function maskDocument(value: string, tipo: "CPF" | "CNPJ"): string {
  return tipo === "CPF" ? maskCpf(value) : maskCnpj(value)
}