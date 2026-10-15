# House Land 360 | Rock & Chopp Festival — Android App

Aplicativo nativo Android desenvolvido com **Kotlin** e **Jetpack Compose** para gestão e venda de ingressos do festival **House Land 360**, com estética premium Rock & Chopp, motor dinâmico de conversão de ingressos, portaria com validação em tempo real e painel administrativo multi-eventos.

## Principais Recursos Portados

1. **Portal Público Multieventos**:
   - Hero banner com badge de edição, título de impacto e chamada para ação (CTA).
   - Cronômetro regressivo ao vivo para a próxima grande edição do festival.
   - Agenda completa de edições com cards informativos, datas, horários e locais.
   - Manifesto e estatísticas oficiais da produtora independente (100% Puro Malte, +15 Mil Público, 8 Anos de Tradição).
   - Canal direto para parcerias e bandas via WhatsApp.
   - Rodapé institucional completo com CNPJ e avisos legais (+18 anos).

2. **Página de Detalhes da Edição**:
   - Hero com imagem da edição e badges dinâmicos de status.
   - Line-up de bandas com fotos, gênero musical, palco, horário e músicas de destaque.
   - Torneiras de Chopp Artesanal (Pilsen Cristal, West Coast IPA, Amber Ale, Black Velvet Stout) com ABV, IBU e notas de degustação.
   - Cardápio Pitmaster BBQ com cortes nobres defumados e acompanhamentos.
   - Barra de ação rápida para resgate ou compra de ingressos.

3. **Motor Dinâmico de Ingressos (Ticket Modal)**:
   - Suporte aos 3 modos operacionais por edição:
     - **Cortesia Grátis (VIP)**: Emissão instantânea com geração de QR Code exclusivo.
     - **Pré-cadastro (Fila VIP)**: Registro de leads com cálculo dinâmico de valor e acompanhantes.
     - **Venda Direta (PIX)**: Simulação de pagamento instantâneo com código Copia e Cola e emissão de ingresso.
   - Suporte dinâmico a até 4 ingressos por CPF com cadastro de acompanhantes.

4. **Portaria & Scanner QR Code**:
   - Validador em tempo real na portaria do evento.
   - Verificação de autenticidade, ingressos já utilizados e ingressos cancelados.
   - Feedback tátil (haptic feedback / vibração) e sonoro/visual.
   - Histórico em tempo real de entradas liberadas.

5. **Painel Administrativo Completo**:
   - Acesso seguro com credenciais de administrador.
   - Gerenciamento de edições (criar, ativar/desativar, mudar modo de ingressos, excluir).
   - Gestão de participantes e leads com busca por nome/CPF e aprovação de cortesias.
   - Emissão manual de cortesias VIP para convidados da produção.
   - Editor de conteúdo visual (CMS) para títulos, banners e links de contato.
   - Gestão de equipe de produção (Admin, Portaria/Scanner, Financeiro).

## Arquitetura & Tecnologias
- **Linguagem**: Kotlin 2.2.10
- **UI Toolkit**: Jetpack Compose com Material Design 3 (M3)
- **Design System**: Estética Rock & Malte (paleta Dark Carbon #0A0A0D com destaques em Âmbar #F59E0B e Dourado)
- **Geração de QR Code**: Biblioteca ZXing Core (renderização offline de Bitmaps em alta resolução)
- **Build System**: Gradle 9.3.1 (Kotlin DSL) com Android Gradle Plugin 9.1.1
- **Alvo**: Android SDK 36 (Min SDK 26)
