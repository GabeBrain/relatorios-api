# Fechamento delimitado V3 — v0.69 — 14/10/2026

**Estado: implementado e validado localmente; revisão antes do push, publicação/reteste real pendentes.** Execução do [plano autorizado](./PLAN_FECHAMENTO_V3_2026-10-14.md). Sem IA nova, mutação em produção, alteração de prompt/Edge Function ou gasto adicional. Documentos FIERGS locais preservados.

## Implementação

- **Custo na reconferência:** DET gratuito termina; imagens a reler abrem confirmação com lote, cache e estimativa em reais/dólares. Cancelar conserva o resultado gratuito, sem IA; confirmar inicia uma vez. Modal existente reutilizado, tokens SE intactos. A estimativa não é teto de faturamento; o gate desta entrega cobre reconferência, não redesenha fase inicial de ata/fluxos consultivos.
- **Textos antigos:** apresentação revalida evidência contra IR do PPTX pareado, incluindo SVG/tabelas nativas. Cofre local só quando hash coincide; reconferência/retomada/vinculação atualizam contexto. Ausência vira Verificar/“Texto antigo não conferido nesta versão”, sem alterar IDs/payload/status/vereditos. Sem PPTX, não presume validação. Âncora por palavras completas evita “desenvolviment” dentro de “desenvolvimento”.
- **Duplicatas:** evidência equivalente/contida do mesmo slide/tipo/confiança, somente pendentes sem decisão humana. Cartão explicita IDs agrupados e que a decisão opera o grupo. Ocorrências em outros slides/decisões diferentes permanecem separadas. Dois defeitos não viram um só por compartilhar o slide.
- **Acusações editoriais:** caixa/layout/título sem contexto e concordância nominal sem correção demonstrada ficam Verificar, sem blacklist de nomes/projetos. Não prova que todo julgamento textual ficou correto.
- **Colunas de imagem:** percentual incompatível que fecha em outra coluna é associação suspeita; Verificar, sem mover número. Limite literal de imagem não confirmado por leituras concordantes fica Verificar. Mesma guarda na geração e apresentação de antigos, sem editar banco. Não corrige pixels/OCR por matemática.
- **Decisões humanas:** reconciliação ao abrir, encerramento de visão e diff DET preservam vereditos/revisão humana. Projeção não modifica objetos originais nem declara ausência como corrigido. Não houve migração.

## Retestes / antes e depois

**31 registros textuais reais:** CJ 10→8 cartões (dois pares CJ23/CJ68), VAP 11→11, v2 10→10; registros originais preservados. Concorrentes Compactos/Identificação, editoriais e trechos antigos sem âncora ficam Verificar. IR completo encontrou também um antigo v2s12 sem âncora atual: não conferido, não apagado. Positivos OBSERTÓRIO/Avalição/são esperado/Shor Stay/uma uma/um custos/Churrasqueria preservados. Transcrição inicial omitiu SVG e falhou no controle Churrasqueria; substituída pela saída do extrator real, sem enfraquecer expectativa.

**Sete caches visuais originais:** três FP revisados (CJ45/56, VAP31) ficam Verificar; faixa sobreposta CJ41, ano VAP73, Arté VAP76 e soma divergente VAP28 continuam presentes. Print/transcrição correta são pista separada do cache. Demais somas inseguras e magnitudes erradas do OCR permanecem sem adjudicação integral.

**Validação:** 248 testes Corretor aprovados, dois dependentes de ambiente/insumo pulados; material Drive testado separadamente. Dez passes dos cinco estudos (fonte congelada + Excel bruto), sem regravar expectativas. Tipos/build aprovados; lint sem erros, aviso de hook groupOf preexistente.

O teste histórico `rolandia-real.test.ts` não incluía seções 04/05 vazias detectadas desde `35c0656`. Arquivos de checklist não foram alterados nesta sessão; expectativa reconciliada com evidência publicada de Rolândia v4, mantendo controles de mapa/ausência. Não esconde regressão do novo código. Uma configuração temporária de congelamento ampliou indevidamente a seleção de testes; seleção corrigida, referência congelada pelo extrator real e suíte Corretor final repetida.

**Chromium local/API de fixtures:** zero chamadas antes da confirmação e após cancelar; confirmar libera apenas funções simuladas. Texto antigo/agrupamento visíveis, zero erro JavaScript. Sem banco/IA real na bancada. Publicação v0.69 ainda não verificada.

## Materiais adicionais e limites

[Pasta Drive](https://drive.google.com/drive/folders/139aKOxC4clvhHe0uXsRJ8lhdIK5cdaYA): 80 arquivos diretos (76 PPTX, três XLSX, um DOCX), principalmente panoramas/institucionais; sem vocacional identificado pelos nomes. [Inventário](./calibracao/automacao/drive-materials-2026-10-14.json). Não é busca recursiva de todo o Drive nem prova de origem dos estudos de outubro/Daniele.

Novo **para esta suíte**, materializado em `.local-inputs/drive-20261014/` por conexão autenticada:

- [PPTX Goiânia/Aparecida junho/2026](https://drive.google.com/file/d/11n-pgm7-7sIlSMXwu4-jGbJUFOGgUphz): 132 slides, zero tabelas nativas, 31 candidatas; SHA-256 `0ea1f769c33184940820435adc203c91ac3e6d7bc957a7fbd027947c465b8179`. Extração/DET executados, sem visão paga. Checklist vocacional acusa ausências num panorama regional: fora do contrato, não erros adjudicados desse arquivo.
- [XLSX Ademi GO junho/2026](https://drive.google.com/file/d/1y4wHvdyY9UT-EnWvDPoq-Pc3doRWcWwy): SHA-256 `e9c3e70317a3d43ccf851f91cb51462c819ac8a02ba222ba633ad0cf4052b6f8`; zero blocos reconhecidos, `papel_desconhecido`. É candidato a fonte pela competência, não pareamento numérico confirmado; precisa de contrato regional.

Salvador/SP/Curitiba/Itajaí e outras competências catalogados; não substituir originais recentes por panoramas homônimos nem gastar IA antes de definir gabarito. Cinco vocacionais locais continuam baseline principal.

## Reprodução / evidência

```powershell
npx vitest run src/features/corretor/lib
npm run test:corretor:materials
npm run dev -- --host 127.0.0.1 --port 5175
# outro terminal:
node scripts/diagnostics/corretor-v069-browser.mjs
```

Bancada versionada exige app local e fixtures; `CORRETOR_LOCAL_URL`/`CORRETOR_TEST_INPUT_ROOT` ajustam caminhos. Teste de material Drive aceita `CORRETOR_NEW_MATERIAL`, `CORRETOR_NEW_MATERIAL_EXCEL`, `CORRETOR_NEW_MATERIAL_OUT`. Brutos não distribuídos no Git.

Logs locais: `.local-inputs/v069-tests.log`, `review-v069-text-result.json`, `review-v069-vision-result.json`, `v069-materials-final.log`, `v069-build-final.log`, `drive-20261014/structure-result.json`, `closure-browser-1792007523169/` (bancada reproduzível). Fixtures versionadas: `review-v069-text.json` (31 textos + IR real) e `review-v069-vision.json` (sete caches); manifesto dos nove PNG mantém URLs/hashes.

Próximo: revisar resultado/commit, publicar com autorização, confirmar bundle e repetir cancelamento/reconferência de estudo conhecido. Não inferir deploy pelo Git. Daniele original, OCR UsHome, demais somas e aceite integral seguem abertos. Nenhum novo prompt foi validado por replay de resposta antiga. Corretor permanece com Gabriel.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`. Sem escrita no Monday.
