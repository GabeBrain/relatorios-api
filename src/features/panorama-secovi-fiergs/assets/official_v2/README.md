# Materiais oficiais V2

Esta pasta é paralela a `../official/`: a V1 permanece intacta como fallback e referência de
auditoria. Os arquivos aqui são usados somente pela composição V2.

- `team-fabio.png`, `team-marcos.png` e `team-teresa.png`: perfis fixos aprovados para a lâmina
  **Equipe técnica**, extraídos da apresentação de referência Baixada Santista.
- Foto, nome, cargo e e-mail do consultor responsável, assim como os slots de analistas, não são
  imagens estáticas. Eles são camadas opcionais do modelo `presentation`, para finalização pelo
  analista e para futura integração com um catálogo de pessoas.

`backgrounds/` contém as superfícies **sem texto dinâmico**, exportadas em 16:9 diretamente dos
PPTs institucionais locais. `cover-report.png` vem da capa Baixada Santista, com os campos de cidade
e trimestre neutralizados antes da exportação; `content.png`, `divider.png`, `dark-team.png` e os
fechamentos vêm do PPT Institucional 2026. O renderer V2 aplica somente as camadas de dados e pessoas
sobre esses fundos, sem reconstruir o padrão em CSS nem injetar o rodapé legado.
