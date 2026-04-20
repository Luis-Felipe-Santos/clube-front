export type StatusPagamento = "PAGO" | "PENDENTE" | "ATRASADO"

export interface PagamentoLista {
  id: number
  socioId: number
  socioNome: string
  socioImagemUrl: string | null
  socioPlanoId: number
  planoId: number
  planoNome: string
  competencia: string
  valorBase: number
  valorFinal: number
  status: StatusPagamento
  dataVencimento: string | null
  dataPagamento: string | null
  observacao: string | null
}

export interface PagamentoCreateDTO {
  socioPlanoId: number
  competencia: string
  desconto?: number | null
  acrescimo?: number | null
  dataVencimento?: string | null
  observacao?: string | null
}

export interface PagamentoQuitarDTO {
  dataPagamento?: string | null
  observacao?: string | null
}

export interface PagamentoAjusteDTO {
  dataPagamento?: string | null
  valorFinal?: number | null
  observacao?: string | null
}

export interface SocioPlanoOption {
  id: number
  socioId: number
  socioNome: string
  planoId: number
  planoNome: string
}

export const usePayments = () => {
  const { get, post, patch } = useCachedApi({
    ttl: 30000
  })

  const listar = async (params: {
    clubeId: number
    planoId?: number | null
    competencia?: string | null
    status?: StatusPagamento | null
    busca?: string | null
  }): Promise<PagamentoLista[]> => {
    const query = new URLSearchParams({
      clubeId: String(params.clubeId),
    })

    if (params.planoId) query.append("planoId", String(params.planoId))
    if (params.competencia) query.append("competencia", params.competencia)
    if (params.status) query.append("status", params.status)
    if (params.busca) query.append("busca", params.busca)

    return await get<PagamentoLista[]>(`/pagamentos?${query.toString()}`)
  }

  const criar = async (data: PagamentoCreateDTO) => {
   return await post("/pagamentos", data as unknown as Record<string, unknown>)
  }

  const quitar = async (id: number, data: PagamentoQuitarDTO) => {
    return await patch(`/pagamentos/${id}/quitar`, data as Record<string, unknown>)
  }

  const ajustar = async (id: number, data: PagamentoAjusteDTO) => {
    return await patch(`/pagamentos/${id}/ajustar`, data as Record<string, unknown>)
  }

  const listarSocioPlanos = async (
    clubeId: number,
    planoId?: number | null
  ): Promise<SocioPlanoOption[]> => {
    let url = `/socio-planos?clubeId=${clubeId}`

    if (planoId) {
      url += `&planoId=${planoId}`
    }

    return await get<SocioPlanoOption[]>(url)
  }

  return {
    listar,
    criar,
    quitar,
    ajustar,
    listarSocioPlanos,
  }
}