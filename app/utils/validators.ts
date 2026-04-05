import { onlyNumbers } from "~/utils/masks"

export function isValidPhone(value: string): boolean {
  const phone = onlyNumbers(value)
  return phone.length >= 10 && phone.length <= 11
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyNumbers(value)

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i)
  }

  let firstDigit = (sum * 10) % 11
  if (firstDigit === 10) firstDigit = 0
  if (firstDigit !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i)
  }

  let secondDigit = (sum * 10) % 11
  if (secondDigit === 10) secondDigit = 0

  return secondDigit === Number(cpf[10])
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyNumbers(value)

  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false

  const calcDigit = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((sum, num, index) => sum + Number(num) * (factors[index] ?? 0), 0)

    const remainder = total % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const base = cnpj.slice(0, 12)
  const firstDigit = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const secondDigit = calcDigit(
    base + firstDigit,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  )

  return cnpj === `${base}${firstDigit}${secondDigit}`
}

export function isValidDocument(value: string, tipo: "CPF" | "CNPJ"): boolean {
  return tipo === "CPF" ? isValidCpf(value) : isValidCnpj(value)
}