# Prebid.js para a Plataforma Adpulse


Este é o fork oficial do **[Ad Pulse](https://adpulse.com.br)** para a biblioteca Prebid.js. Esta versão é mantida e otimizada pela nossa equipe para garantir a integração perfeita com a nossa plataforma de monetização, usada por publishers em todo o Brasil.

Nosso objetivo é oferecer a melhor performance de header bidding, adaptada às necessidades do ecossistema da Adpulse. Contribuímos ativamente com pull requests para o projeto principal do Prebid.js, ajudando a evoluir a comunidade open source.

## Propósito deste Fork

Este repositório serve como base para a biblioteca Prebid.js utilizada dentro do nosso ad server. As principais razões para mantermos um fork próprio são:

*   **Integração Direta:** Adaptações específicas para garantir compatibilidade e performance máxima com a biblioteca Javascript da Adpulse.
*   **Otimização e Performance:** Implementação de melhorias e testes focados em nosso ambiente de produção para garantir velocidade e estabilidade aos nossos publishers.
*   **Desenvolvimento Ágil:** Capacidade de testar e implementar novas funcionalidades rapidamente antes de serem incorporadas ao projeto principal.

## Como Manter seu Fork Sincronizado

Para garantir que este fork permaneça atualizado com as últimas mudanças do repositório original do Prebid.js (`upstream`), siga os passos abaixo. Este procedimento é essencial para incorporar novas funcionalidades, correções de bugs e melhorias de performance.

### Passo 1: Configurar o Repositório Original como "Upstream"

Se esta é a primeira vez que você sincroniza, você precisa adicionar o repositório original como um remote. Você só precisa fazer isso uma vez.

```bash
git remote add upstream [https://github.com/prebid/Prebid.js.git](https://github.com/prebid/Prebid.js.git)