-- Migration: Corretor v3.3 (Fase B da ata) — persiste a ata extraída no estudo
--
-- A ata de abertura é extraída no passo único (1º slide) e vira a régua do estudo:
-- alimenta a cidade (CITY_NAME) e, na Fase C, o checklist de cobertura (ATA_COVERAGE).
-- Guardada como jsonb (null = não localizada/extraída). A cidade também é copiada
-- para studies_v3.cidade (coluna já existente) para o card da homepage e a IA de texto.

alter table public.studies_v3
  add column if not exists ata jsonb;
