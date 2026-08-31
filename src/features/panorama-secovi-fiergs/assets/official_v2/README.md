# Materiais oficiais V2

Esta pasta é paralela a `../official/`: a V1 permanece intacta como fallback e referência de
auditoria. Os arquivos aqui são usados somente pela composição V2.

- `team-fabio.png`, `team-marcos.png` e `team-teresa.png`: perfis fixos aprovados para a lâmina
  **Equipe técnica**, extraídos da apresentação de referência Baixada Santista.
- Foto, nome, cargo e e-mail do consultor responsável, assim como os slots de analistas, não são
  imagens estáticas. Eles são camadas opcionais do modelo `presentation`, para finalização pelo
  analista e para futura integração com um catálogo de pessoas.

Os fundos de capa, sumário, divisórias e créditos são desenhados pelo renderer V2; isso preserva
os campos dinâmicos (cidades, trimestre, páginas e créditos) e evita texto congelado em imagem.
