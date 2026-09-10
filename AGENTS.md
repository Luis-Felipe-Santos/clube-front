# Regras gerais do projeto

## Stack

- Vue 3
- Nuxt
- TypeScript
- JavaScript
- Pinia
- Vue Router

## Vue

- Utilizar Vue 3.
- Utilizar Composition API.
- Preferir `<script setup>`.
- Não utilizar Options API em novos componentes.
- Utilizar TypeScript nos novos componentes quando possível.
- Criar componentes reutilizáveis quando fizer sentido.
- Respeitar os padrões de reatividade do Vue 3.

## Nuxt

- Utilizar as convenções e recursos nativos do Nuxt.
- Utilizar `pages/` para páginas quando aplicável.
- Utilizar `components/` para componentes reutilizáveis.
- Utilizar `composables/` para lógica reutilizável.
- Utilizar `layouts/` para estruturas compartilhadas de páginas.
- Utilizar `middleware/` para regras de navegação e autenticação quando necessário.
- Utilizar `plugins/` somente quando houver necessidade de integração ou inicialização global.
- Respeitar SSR e a hidratação do Nuxt.
- Evitar soluções que funcionem apenas no client-side quando o código puder ser executado durante SSR.
- Antes de criar uma nova solução, verificar como o projeto já resolve problemas semelhantes.

## TypeScript

- Utilizar TypeScript como padrão para novos arquivos de código.
- Preferir arquivos `.ts` em vez de `.js` para novos arquivos.
- Utilizar `<script setup lang="ts">` nos componentes Vue quando apropriado.
- Tipar props, emits, estados, funções e respostas de API quando necessário.
- Evitar `any`.
- Não utilizar `@ts-ignore` sem uma justificativa clara.
- Não utilizar `@ts-nocheck` para esconder erros.
- Aproveitar a inferência de tipos do TypeScript quando ela for suficiente.
- Reutilizar tipos existentes antes de criar novos tipos.
- Respeitar o `tsconfig.json` existente do projeto.
- Não desabilitar verificações do TypeScript apenas para eliminar erros.

## JavaScript

- JavaScript pode ser utilizado em arquivos existentes que já utilizem `.js`.
- Não converter arquivos JavaScript existentes para TypeScript sem necessidade.
- Novos arquivos devem utilizar TypeScript quando possível.
- Utilizar JavaScript moderno.
- Preferir `const` e `let`.
- Utilizar `async/await` quando melhorar a legibilidade.
- Evitar código desnecessariamente complexo.

## Pinia

- Utilizar Pinia para gerenciamento de estado global.
- Procurar stores existentes antes de criar uma nova.
- Evitar colocar lógica complexa diretamente nos componentes.
- Manter cada store com uma responsabilidade clara.
- Utilizar TypeScript para tipar stores quando o projeto estiver configurado para isso.

## Arquitetura

- `components/` para componentes reutilizáveis.
- `composables/` para lógica reutilizável.
- `stores/` para estado global.
- `pages/` para páginas e rotas quando utilizando o sistema de páginas do Nuxt.
- `layouts/` para estruturas compartilhadas.
- `middleware/` para middleware de navegação.
- `plugins/` para plugins do Nuxt.
- `utils/` para funções utilitárias reutilizáveis.

Antes de criar qualquer arquivo ou estrutura nova, verificar se já existe um padrão semelhante no projeto.

## Código

- Não duplicar lógica.
- Não instalar dependências sem necessidade.
- Não modificar arquivos não relacionados à tarefa.
- Respeitar os padrões existentes.
- Preferir código simples, legível e fácil de manter.
- Evitar abstrações desnecessárias.
- Não criar componentes ou composables apenas para pequenas lógicas que não precisam ser reutilizadas.
- Não remover código existente sem explicar o motivo.

## API

- Utilizar o padrão de comunicação com API já existente no projeto.
- Antes de criar uma nova forma de realizar requisições, procurar implementações existentes.
- Tipar dados de entrada e saída quando estiver utilizando TypeScript.
- Tratar estados de carregamento e erro quando necessário.
- Não assumir a estrutura de uma API sem verificar o código existente.

## SSR e Client-Side

- Considerar que o Nuxt pode executar código no servidor e no navegador.
- Não acessar diretamente `window`, `document` ou `localStorage` durante SSR.
- Utilizar APIs e recursos do Nuxt apropriados para diferenciar código server-side e client-side.
- Evitar problemas de hidratação.
- Não utilizar APIs exclusivas do navegador sem verificar se o código está sendo executado no client.

## Qualidade

- Sempre revisar as alterações.
- Executar build quando uma alteração relevante for concluída.
- Executar lint quando disponível.
- Executar testes quando disponíveis.
- Verificar erros de TypeScript.
- Não esconder erros.
- Não ignorar erros apenas para concluir uma tarefa.
- Corrigir problemas introduzidos pela própria alteração sempre que possível.

## Antes de implementar

Antes de alterar o código:

1. Entender o requisito.
2. Analisar os arquivos relacionados.
3. Procurar implementações semelhantes.
4. Identificar os padrões utilizados pelo projeto.
5. Definir a abordagem mais simples e adequada.
6. Implementar somente o necessário.
7. Revisar as alterações.
8. Executar as validações disponíveis.

## Comunicação

- Explicar de forma clara o que foi alterado.
- Informar quais arquivos foram modificados.
- Explicar decisões técnicas importantes.
- Informar possíveis impactos ou pontos de atenção.
- Quando houver um conceito importante de Vue, Nuxt ou TypeScript, explicar brevemente o motivo da solução.
