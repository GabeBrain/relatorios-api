import argparse
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

hora_atual = datetime.now(timezone(timedelta(hours=-3)))
timestamp_arquivo = datetime.now(timezone(timedelta(hours=-3))).strftime("%Y%m%d")

REGEX_CARACTERE_INVALIDO = r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]"
REGEX_DATAS = r"^(?:19[0-9]{2}|20[0-4][0-9]|2050)-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$"
REGEX_NUMERO_POSITIVO = r"^\d+(?:[.,]\d+)?$"
REGEX_ENDERECO = r"(?i)^(?:$|sem\s*nr[o\.]?|s\s*\/\s*n[º°\.]?|s\.n\.|sn|nro[\.]?|0+$)"
REGEX_INTEIRO = r"^-?\d+$"
REGEX_NUMERO_POSITIVO = r"^\d+$"
REGEX_MAIOR_QUE_ZERO = r"^(?!0(?:[.,]0+)?$)\d+(?:[.,]\d+)?$"
REGEX_NORTE_NORDESTE = r"(?i)\b(?:AM|AC|AP|PA|RO|RR|TO|AL|BA|CE|MA|PB|PE|PI|RN|SE)\b"
REGEX_CEP_INVALIDO = r"^(?:0{8}|1{8}|2{8}|3{8}|4{8}|5{8}|6{8}|7{8}|8{8}|9{8})$"


def limpar_caracteres_ilegais(texto):
    if isinstance(texto, str):
        return re.sub(r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]", "", texto)
    return texto



def faixas_area_privativa(valores):
    """Replica os cortes dinâmicos do Dashboard: até 6 faixas por cidade/tipo."""
    import math
    valores = sorted(float(v) for v in valores if pd.notna(v) and math.isfinite(float(v)) and float(v) > 0)
    if not valores:
        return []
    cortes = []
    for i in range(1, 6):
        valor = valores[min(len(valores) - 1, len(valores) * i // 6)]
        magnitude = 10 ** (math.floor(math.log10(valor)) - 1)
        corte = math.floor(valor / magnitude + 0.5) * magnitude
        if corte > 0 and (not cortes or corte > cortes[-1]):
            cortes.append(corte)
    limites = [0, *cortes]
    return [(inicio, limites[i + 1] if i + 1 < len(limites) else math.inf) for i, inicio in enumerate(limites)]


def adicionar_faixas_area_privativa(df):
    """Uma observação por tipologia; última área positiva, antes do corte temporal."""
    import math
    coluna = "area_privativa_representativa"
    if coluna not in df:
        df[coluna] = df["private_area"]
    df["faixa_area_privativa"] = "Área não informada"
    for _, escopo in df.groupby(["city", "building_type"], dropna=False):
        unicas = escopo.drop_duplicates(["building_id", "typology_id"], keep="last")
        faixas = faixas_area_privativa(pd.to_numeric(unicas[coluna], errors="coerce").tolist())
        for indice, linha in escopo.iterrows():
            area = pd.to_numeric(linha[coluna], errors="coerce")
            if pd.isna(area):
                continue
            for inicio, fim in faixas:
                if inicio <= area < fim:
                    fim_texto = "∞" if math.isinf(fim) else f"{fim:g}"
                    df.loc[indice, "faixa_area_privativa"] = f"Área: [{inicio:g}, {fim_texto}) m²"
                    break
    return df


def converter_tipos(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(by=["building_id", "typology_id", "period"])

    # Decimais
    colunas_float = [
        "bank_financing",
        "own_financing",
        "interest_rate_index",
        "interest_rate_tax",
        "down_payment_percentage",
        "discount_percentage",
        "price",
        "price_private_area",
        "price_public_area",
        "vgv_total",
        "vgv_stock",
        "latitude",
        "longitude",
        "private_area",
        "public_area",
        "taxa_associativa",
    ]

    for col in colunas_float:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Datas
    colunas_data = [
        "release_date",
        "delivery_date",
        "database",
        "period",
        "last_update",
        "building_created_at",
    ]

    for col in colunas_data:
        data = pd.to_datetime(df[col], errors="coerce")
        df[col] = data.dt.date
        df[f"{col}_str"] = data.dt.strftime("%m/%Y")
        df[f"{col}_year"] = data.dt.year

    # Inteiros
    colunas_int = [
        "building_id",
        "typology_id",
        "towers",
        "floors",
        "elevators",
        "number_of_installments",
        "time_on_sale",
        "number_bedroom",
        "qty",
        "typology_stock",
        "sold",
        "sold_in_period",
        "number_suite",
        "bathrooms",
        "distractions",
        "gross_sales",
    ]

    for col in colunas_int:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")

    # Tratativas específicas
    df["private_area_str"] = df["private_area"].astype(str) + " m2"
    df["number_bedroom_str"] = df["number_bedroom"].fillna(0).astype(str) + " dorms"
    df["zipcode5"] = df["zipcode"].fillna(0).astype(str).str.split(".").str[0].str.zfill(8).str[:5]
    df["has_garage"] = df["garage"].fillna("0").str[:1] != "0"
    df["months_from_release"] = ((pd.to_datetime(df["period"]) - pd.to_datetime(df["release_date"])).dt.days / 30.44).fillna(0).round(0)
    df["total_price"] = (df["qty"].fillna(0) * df["price"].fillna(0)).fillna(0).round(2)
    df["total_area"] = (df["qty"].fillna(0) * df["private_area"].fillna(0)).fillna(0).round(2)
    df["price_m2"] = (df["price"].fillna(0) / df["private_area"].replace(0, pd.NA)).fillna(0).round(2)
    df["sales_rate"] = (df["sold"].fillna(0) / df["qty"].replace(0, pd.NA)).fillna(0).round(2)

    grupo_empreendimento = ["building_id", "period"]
    df["building_price"] = df.groupby(grupo_empreendimento)["total_price"].transform("sum").fillna(0).round(2)
    df["building_m2"] = df.groupby(grupo_empreendimento)["total_area"].transform("sum").fillna(0).round(2)
    df["building_qty"] = df.groupby(grupo_empreendimento)["qty"].transform("sum").fillna(0).round(0)
    df["building_sold"] = df.groupby(grupo_empreendimento)["sold"].transform("sum").fillna(0).round(0)
    df["building_stock"] = (df["building_qty"].fillna(0) - df["building_sold"].replace(0, pd.NA)).fillna(0).round(0)
    df["building_qty_20"] = (df["building_qty"].fillna(0) * 0.2).fillna(0).round(0)
    df["building_qty_70"] = (df["building_qty"].fillna(0) * 0.7).fillna(0).round(0)
    df["building_price_m2"] = (df["building_price"].fillna(0) / df["building_m2"].replace(0, pd.NA)).fillna(0).round(2)
    df["building_ticket"] = (df["building_price"].fillna(0) / df["building_qty"].replace(0, pd.NA)).fillna(0).round(2)
    df["building_m2_avg"] = (df["building_m2"].fillna(0) / df["building_qty"].replace(0, pd.NA)).fillna(0).round(2)
    df["building_sales_rate"] = (df["building_sold"].fillna(0) / df["building_qty"].replace(0, pd.NA)).fillna(0).round(2)

    # Adicionado em 02/09/2026
    df_temp = df.copy()
    df_temp.loc[df["number_bedroom"] != 1, ["qty", "total_area", "total_price"]] = 0
    df["building_units_one_bedroom"] = df_temp.groupby(grupo_empreendimento)["qty"].transform("sum")
    df["one_bedroom_percent"] = (df["building_units_one_bedroom"].fillna(0) / df["building_qty"].replace(0, pd.NA)).fillna(0).round(2)

    # Calculo para tipologia "Padrão"
    df_temp = df.copy()
    df_temp.loc[df["type_of_typology"] != "Padrão", ["qty", "total_area", "total_price"]] = 0
    df["standard_price"] = df_temp.groupby(grupo_empreendimento)["total_price"].transform("sum").fillna(0).round(2)
    df["standard_qty"] = df_temp.groupby(grupo_empreendimento)["qty"].transform("sum").fillna(0).round(2)
    df["standard_m2"] = df_temp.groupby(grupo_empreendimento)["total_area"].transform("sum").fillna(0).round(2)
    df["standard_ticket"] = (df["standard_price"].fillna(0) / df["standard_qty"].replace(0, pd.NA)).fillna(0).round(2)
    df["standard_price_m2"] = (df["standard_price"].fillna(0) / df["standard_m2"].replace(0, pd.NA)).fillna(0).round(2)

    # Cálculo para tipologia "Cobertura"
    df_temp = df.copy()
    df_temp.loc[df["type_of_typology"] != "Cobertura", ["qty", "total_area", "total_price"]] = 0
    df["roof_price"] = df_temp.groupby(grupo_empreendimento)["total_price"].transform("sum").fillna(0).round(2)
    df["roof_qty"] = df_temp.groupby(grupo_empreendimento)["qty"].transform("sum").fillna(0).round(2)
    df["roof_m2"] = df_temp.groupby(grupo_empreendimento)["total_area"].transform("sum").fillna(0).round(2)
    df["roof_ticket"] = (df["roof_price"].fillna(0) / df["roof_qty"].replace(0, pd.NA)).fillna(0).round(2)
    df["roof_price_m2"] = (df["roof_price"].fillna(0) / df["roof_m2"].replace(0, pd.NA)).fillna(0).round(2)

    # Cálculo para tipologia "Garden"
    df_temp = df.copy()
    df_temp.loc[df["type_of_typology"] != "Garden", ["qty", "total_area", "total_price"]] = 0
    df["garden_price"] = df_temp.groupby(grupo_empreendimento)["total_price"].transform("sum").fillna(0).round(2)
    df["garden_qty"] = df_temp.groupby(grupo_empreendimento)["qty"].transform("sum").fillna(0).round(2)
    df["garden_m2"] = df_temp.groupby(grupo_empreendimento)["total_area"].transform("sum").fillna(0).round(2)
    df["garden_ticket"] = (df["garden_price"].fillna(0) / df["garden_qty"].replace(0, pd.NA)).fillna(0).round(2)
    df["garden_price_m2"] = (df["garden_price"].fillna(0) / df["garden_m2"].replace(0, pd.NA)).fillna(0).round(2)

    df = adicionar_faixas_area_privativa(df)
    df["dimensao_cluster"] = df["number_bedroom_str"]
    loteamento = df["standard"].fillna("").str.contains("loteamento", case=False, regex=False)
    df.loc[loteamento, "dimensao_cluster"] = df.loc[loteamento, "faixa_area_privativa"]

    agrupamento_cidade = [
        "city",
        "building_type",
        "type_of_typology",
        "standard",
        "dimensao_cluster",
        "zipcode5",
        "release_date_year",
    ]

    df["cluster"] = df[agrupamento_cidade].fillna("").astype(str).agg("|".join, axis=1)
    df["cluster_buildings"] = df.groupby(agrupamento_cidade)["building_id"].transform("nunique").fillna(0).round(0)

    # agrupamento_cidade = ["cluster", "period"]
    df["city_units"] = df.groupby(agrupamento_cidade)["qty"].transform("sum").fillna(0).round(0)
    df["city_units_median"] = df.groupby(agrupamento_cidade)["qty"].transform("median").fillna(0).round(0)
    df["city_sold"] = df.groupby(agrupamento_cidade)["sold"].transform("sum").fillna(0).round(0)
    df["city_sold_median"] = df.groupby(agrupamento_cidade)["sold"].transform("median").fillna(0).round(0)
    df["city_price"] = df.groupby(agrupamento_cidade)["total_price"].transform("sum").fillna(0).round(2)
    df["city_price_median"] = df.groupby(agrupamento_cidade)["price"].transform("median").fillna(0).round(2)
    df["city_price_ticket"] = (df["city_price"].fillna(0) / df["city_units"].replace(0, pd.NA)).fillna(0).round(2)
    df["city_m2"] = df.groupby(agrupamento_cidade)["total_area"].transform("sum").fillna(0).round(2)
    df["city_m2_median"] = df.groupby(agrupamento_cidade)["private_area"].transform("median").fillna(0).round(2)
    df["city_m2_avg"] = (df["city_m2"].fillna(0) / df["city_units"].replace(0, pd.NA)).fillna(0).round(2)
    df["city_sales_rate"] = (df["city_sold"].fillna(0) / df["city_units"].replace(0, pd.NA)).fillna(0).round(2)
    df["city_price_m2"] = (df["city_price"].fillna(0) / df["city_m2"].replace(0, pd.NA)).fillna(0).round(2)
    df["city_price_m2_median"] = df.groupby(agrupamento_cidade)["price_m2"].transform("median").fillna(0).round(2)

    # Referência formada somente por unidades sem vagas, dentro do cluster.
    df_temp = df.copy()
    df_temp.loc[df["has_garage"], ["qty", "total_price", "total_area"]] = 0
    df["qty_no_garage"] = df_temp.groupby(agrupamento_cidade)["qty"].transform("sum").fillna(0).round(0)
    df["price_no_garage"] = df_temp.groupby(agrupamento_cidade)["total_price"].transform("sum").fillna(0).round(2)
    df["area_no_garage"] = df_temp.groupby(agrupamento_cidade)["total_area"].transform("sum").fillna(0).round(2)
    df["avg_ticket_no_garage"] = (df["price_no_garage"].fillna(0) / df["qty_no_garage"].replace(0, pd.NA)).fillna(0).round(2)
    df["avg_price_m2_no_garage"] = (df["price_no_garage"].fillna(0) / df["area_no_garage"].replace(0, pd.NA)).fillna(0).round(2)

    # Replica o valor para toda a cidade para ser utilizada na comparacao linha x linha
    agrupamento_cidade = ["city", "period"]
    df_temp = df.copy()
    df_temp.loc[df["pattern"] != "Loteamento Fechado", ["total_area", "total_price"]] = 0
    df["area_lote_fechado"] = df_temp.groupby(agrupamento_cidade)["total_area"].transform("sum").fillna(0).round(2)
    df["vgv_lote_fechado"] = df_temp.groupby(agrupamento_cidade)["total_price"].transform("sum").fillna(0).round(2)
    df["city_price_m2_lote_fechado"] = (df["vgv_lote_fechado"].fillna(0) / df["area_lote_fechado"].replace(0, pd.NA)).fillna(0).round(2)
    df["datarel"] = hora_atual.date()

    return df


def obter_campos_depara():
    de_para = {
        "building_id": "ID Empreendimento",
        "name": "Empreendimento",
        "release_date": "Data Lançamento",
        "release_date_str": "Data Lançamento",
        "release_date_year": "Ano Lançamento",
        "delivery_date": "Data Entrega",
        "building_type": "Tipo",
        "zipcode": "CEP",
        "address": "Endereco",
        "address_number": "Numero",
        "neighborhood": "Bairro",
        "city_id": "ID Cidade",
        "city": "Cidade",
        "state": "UF",
        "latitude": "Latitude",
        "longitude": "Longitude",
        "towers": "Torres",
        "floors": "Andares",
        "elevators": "Elevadores",
        "status": "Situacao Atual",
        "total_stock": "Oferta Final",
        "total_units": "Oferta Lancada",
        "builder_name": "Construtora",
        "standard": "Padrão Atual",
        "interest_rate_index": "Indice Juros",
        "interest_rate_tax": "Taxa Juros",
        "bank_financing": "Financiamento Bancário",
        "own_financing": "Financiamento Próprio",
        "fiduciary_ownership": "Alienacao Fiduciaria",
        "down_payment_percentage": "Porcentagem Entrada",
        "discount_percentage": "Porcentagem Desconto A Vista",
        "number_of_installments": "Parcelas",
        "last_update": "Última Atualizacao",
        "last_update_str": "Última Atualizacao",
        "typology_id": "ID Tipologia",
        "building_status": "Situacao Periodo",
        "time_on_sale": "Tempo Venda",
        "type_of_typology": "Tipologia",
        "garage": "Vagas Garagem",
        "qty": "Oferta Inicial",
        "number_bedroom": "Dormitorios",
        "number_bedroom_str": "Dormitorios",
        "private_area": "Area Privativa",
        "private_area_str": "M2",
        "public_area": "Area Publica",
        "database": "Database",
        "database_str": "Database",
        "release_price": "Preco Lançamento",
        "period": "Periodo",
        "period_str": "Periodo",
        "price": "Preco",
        "price_private_area": "Preco M2 Privativo",
        "price_public_area": "Preco M2 Publico",
        "vgv_total": "VGV Total",  # total_units * price
        "vgv_stock": "VGV Estoque",  # total_stock * price
        "typology_stock": "Estoque",
        "sold": "Quantidade Vendida Ate Periodo",  # considera o sold_in_period
        "sold_in_period": "Quantidade Vendida No Periodo",
        "ivv": "IVV Empreendimento",  # (unidades vendidas / oferta lancada) / (último período – data de Lançamento),
        "valor": "Valor",
        "campo": "Campo",
        "erro": "Erro",
        "auxiliar": "Auxiliar",
        "grupo": "Grupo",
        "has_suites": "Possui Suites",  # novo v2
        "bathrooms": "Banheiros",  # novo v2
        "pattern": "Padrao Historico",  # novo v2
        "number_suite": "Suites",  # novo v2
        "estagio_empreendimento": "Estagio Obra",  # novo v2
        "taxa_associativa": "Taxa Associativa",  # novo v2,
        "latitude, longitude": "Latitude e Longitude",
        "analist": "Analista",
        "building_created_at": "Data Cadastro",
        "building_created_at_str": "Data Cadastro",
        "operator": "Operador",
        "distractions": "Distrato",
        "gross_sales": "Venda Bruta",
        "datarel": "Data Relatório",
        "has_image": "Possui imagem",
        "has_attachments": "Possui evidências",
        "has_tables": "Possui tabelas",
        "region": "Região",
        "follow_up_period": "Periodicidade",
        "estimation": "Foi estimado",
        "pattern_typology": "Padrão tipologia",
        "status_typology": "Status tipologia",
        "installment_value": "Valor parcelas",
        "installment_value_typology": "Valor parcelas tipologia",
        "no_leisure_area": "Não possui áreas de lazer",
        "areas": "Áreas de lazer",
        "incorporators": "Incorporadora",
        "faixa_area_privativa": "Faixa Área Privativa",
        "cluster": "Cluster",
        "cluster_buildings": "Qtd Empreendimentos",
    }

    return de_para


def obter_ultimo_periodo(df: pd.DataFrame):
    # df_ultimo = df.loc[df["period"] == df["database"]].copy()
    df_ultimo = df.copy()
    df_ultimo.sort_values(
        by=["database", "period", "building_id", "typology_id"],
        inplace=True,
        ignore_index=True,
    )
    df_ultimo.drop_duplicates(subset=["typology_id"], keep="last", inplace=True, ignore_index=True)
    return df_ultimo


def converter_dataframes(lista_df: list):
    selecionar = [
        "database_str",
        "status",
        "analist",
        "building_id",
        "typology_id",
        "name",
        "private_area_str",
        "state",
        "neighborhood",
        "city",
        "building_type",
        "type_of_typology",
        "standard",
        "number_bedroom_str",
        "period_str",
        "release_date_year",
        "faixa_area_privativa",
        "cluster",
        "cluster_buildings",
        "garage",
        "grupo",
        "erro",
        "campo",
        "valor",
    ]

    if lista_df:
        df_erros = pd.concat(lista_df, axis=0).reset_index(drop=True)
        print("↔️  Renomear campos de erros")
        de_para = obter_campos_depara()
        df_erros["campo"] = df_erros["campo"].map(de_para).fillna("Não Identificado")
        df_erros = df_erros[selecionar]
    else:
        df_erros = pd.DataFrame(columns=selecionar)

    return df_erros


def finalizar_tratamentos(df: pd.DataFrame) -> pd.DataFrame:
    print("🧹 Tratar caracteres inválidos")
    colunas_texto = df.select_dtypes(include=["object", "string"]).columns
    df[colunas_texto] = df[colunas_texto].map(limpar_caracteres_ilegais)

    classificar = [
        "cluster",
        "name",
        "typology_id",
    ]

    df.sort_values(by=classificar, ignore_index=True, inplace=True)

    print("↔️  Renomear colunas")
    de_para = obter_campos_depara()
    df.rename(columns=de_para, inplace=True)
    df["Observações"] = None

    return df


def expandir_tipologias(todos_dados: list) -> pd.DataFrame:
    """
    Normaliza a lista de dicionários da API expandindo 'typologies_history'
    em novas linhas, preservando os dados do empreendimento principal.
    """
    if not todos_dados:
        return pd.DataFrame()

    cols_para_remover = [
        "areas",
        "city_id",
        "time_on_sale",
    ]

    col_historico = "typologies_history"

    # Renomeia a chave 'period' para 'database' no objeto pai antes da normalização
    for item in todos_dados:
        if isinstance(item, dict) and "period" in item:
            item["database"] = item.pop("period")

    # Filtra apenas os metadados que realmente existem no primeiro registro para evitar KeyError
    primeiro_reg = todos_dados[0] if isinstance(todos_dados[0], dict) else {}
    cols_meta = [chave for chave in primeiro_reg if chave != col_historico and chave not in cols_para_remover]

    try:
        # Extrai typologies_history para cada linha e repete os campos de meta
        df_expandido = pd.json_normalize(
            todos_dados,
            record_path=[col_historico],
            meta=cols_meta,
            errors="ignore",
        )

        # Preserva a última área positiva de todo o histórico para reproduzir o Dashboard.
        df_expandido["area_privativa_representativa"] = pd.to_numeric(df_expandido["private_area"], errors="coerce")
        df_expandido = df_expandido.sort_values("period")
        df_expandido["area_privativa_representativa"] = df_expandido.groupby(["building_id", "typology_id"], dropna=False)["area_privativa_representativa"].transform(lambda valores: valores[valores.gt(0)].iloc[-1] if valores.gt(0).any() else float("nan"))
        return df_expandido

    except (KeyError, ValueError) as e:
        print(f"⚠️ Erro ao expandir '{col_historico}': + {e}. Retornando formato padrão.")
        return pd.json_normalize(todos_dados)


def ler_arquivos_json(analise_historica: bool):
    nome_arquivo = Path(f"{PARAM_CAMINHO}interno_concatenado.jsonl")

    print(f"📚 Lendo JSONL concatenado: {nome_arquivo}")
    df_agrupado = pd.read_json(nome_arquivo, lines=True, dtype={"zipcode": str})
    print(f"✅ Total de linhas (empreendimentos): {len(df_agrupado)}")

    # gera uma nova linha para cada tipologia do empreendimento
    print("🔃 Expandindo tipologias")
    df_concatenado = expandir_tipologias(df_agrupado.to_dict(orient="records"))
    print(f"✅ Total de linhas (tipologias): {len(df_concatenado)}")

    # analisar somente o último período, comentar esse trecho se for analisar o histórico
    if not analise_historica:
        df_concatenado = obter_ultimo_periodo(df_concatenado)
        print(f"✅ Total de linhas (último período): {len(df_concatenado)}")

    print("🔃 Convertendo tipos dos dados")
    df_concatenado = converter_tipos(df_concatenado)

    # print(df_concatenado.columns)
    # print(df_concatenado.info())
    # print(df_concatenado.head())

    return df_concatenado


def validar_empreendimentos_grupos(df: pd.DataFrame) -> list[pd.DataFrame]:
    print(f"🟢 Validando empreendimentos: {len(df)}")

    df.sort_values(by=["database", "period", "building_id", "typology_id"], inplace=True)

    df.drop_duplicates(subset=["building_id"], keep="last", inplace=True, ignore_index=True)

    df["private_area_str"] = "Empreendimento"
    df["typology_id"] = 0

    print(f"🔵 Distintos [building_id]: {len(df)}")

    dados_errados = []

    filtro1 = df["months_from_release"] > 24
    filtro2 = df["status"] == "Ativo"
    filtro3 = df["building_sales_rate"].fillna(0) <= 0.30
    filtro = (filtro1) & (filtro2) & (filtro3)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "> 24 meses, Ativo, Vendido ≤ 30% das unidades"
        df_erros["campo"] = "total_stock"
        df_erros["valor"] = (
            "Tempo venda: "
            + df_erros["months_from_release"].fillna(0).round(0).astype(str)
            + " | Estoque atual: "
            + df_erros["total_stock"].fillna(0).round(0).astype(str)
            + " | Total vendido: "
            + df_erros["building_sold"].fillna(0).round(0).astype(str)
            + " | Oferta lançada: "
            + df["building_qty"].fillna(0).round(0).astype(str)
            + " | % Vendido: "
            + df["building_sales_rate"].astype(str)
        )
        df_erros["grupo"] = "Estoque - Empreendimento"
        dados_errados.append(df_erros)

    filtro1 = df["months_from_release"] <= 24
    filtro2 = df["status"] == "Ativo"
    filtro3 = df["building_sales_rate"].fillna(0) >= 0.80
    filtro = (filtro1) & (filtro2) & (filtro3)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "≤ 24 meses, Ativo, Vendido ≥ 80% das unidades"
        df_erros["campo"] = "total_stock"
        df_erros["valor"] = (
            "Tempo venda: "
            + df_erros["months_from_release"].fillna(0).round(0).astype(str)
            + " | Estoque atual: "
            + df_erros["total_stock"].fillna(0).round(0).astype(str)
            + " | Total vendido: "
            + df_erros["building_sold"].fillna(0).round(0).astype(str)
            + " | Oferta lançada: "
            + df["building_qty"].fillna(0).round(0).astype(str)
            + " | % Vendido: "
            + df["building_sales_rate"].astype(str)
        )
        df_erros["grupo"] = "Estoque - Empreendimento"
        dados_errados.append(df_erros)

    # filtro1 = abs((df["building_sold"].fillna(0) / df["city_sold_median"].fillna(0)) - 1) > 0.5
    filtro1 = abs((df["building_sales_rate"].fillna(0) / df["city_sales_rate"].fillna(0)) - 1) > 0.5
    filtro2 = df["cluster_buildings"].fillna(0) > 1
    filtro = (filtro1) & (filtro2)
    # filtro = filtro1
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Taxa de vendas com desvio > 50% da taxa do cluster"
        df_erros["campo"] = "sold"
        df_erros["valor"] = (
            "Vendas: "
            + df_erros["building_sold"].fillna(0).round(0).astype(str)
            + " | Oferta lançada: "
            + df["building_qty"].fillna(0).round(0).astype(str)
            + " | % Vendido: "
            + df["building_sales_rate"].astype(str)
            + " | Empreendimentos: "
            + df["cluster_buildings"].fillna(0).round(0).astype(str)
            + " | Mediana cluster: "
            + df_erros["city_sold_median"].fillna(0).round(0).astype(str)
            + " | % Vendido cluster: "
            + df["city_sales_rate"].astype(str)
        )
        df_erros["grupo"] = "Estoque - Tipologia"
        dados_errados.append(df_erros)

    return dados_errados


def validar_tipologias_grupos(df: pd.DataFrame) -> list[pd.DataFrame]:
    print(f"🟢 Validando tipologias: {len(df)}")

    df.sort_values(by=["period", "typology_id"], inplace=True)
    df.drop_duplicates(subset=["typology_id"], keep="last", inplace=True, ignore_index=True)

    print(f"🔵 Distintos [typology_id]: {len(df)}")

    dados_errados = []

    filtro1 = df["building_type"] == "Vertical"
    filtro2 = df["standard"] == "Compacto"
    filtro3 = df["private_area"].fillna(0) >= 50
    filtro4 = df["number_bedroom"].fillna(0) <= 1
    filtro = (filtro1) & (filtro2) & (filtro3) & (filtro4)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Compacto ≥ 50 m² com até 1 quarto"
        df_erros["campo"] = "private_area"
        df_erros["valor"] = "M²: " + df_erros["private_area"].fillna(0).astype(str) + " | Quartos: " + df_erros["number_bedroom_str"].fillna("").astype(str)
        df_erros["grupo"] = "Erro"
        df_erros["grupo"] = "Metragem - Tipologia"
        dados_errados.append(df_erros)

    filtro1 = abs((df["price"].fillna(0) / df["city_price_median"].fillna(0)) - 1) >= 0.30
    filtro2 = df["cluster_buildings"].fillna(0) > 1
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Desvio ≥ 30% da mediana do cluster"
        df_erros["campo"] = "price"
        df_erros["valor"] = "Preço: " + df_erros["price"].fillna(0).round(2).astype(str) + " | Mediana cluster: " + df_erros["city_price_median"].fillna(0).round(2).astype(str) + " | Empreendimentos: " + df["cluster_buildings"].astype(str)
        df_erros["grupo"] = "Preço - Tipologia"
        dados_errados.append(df_erros)

    filtro1 = df["price"].fillna(0) < 1000
    filtro2 = df["cluster_buildings"].fillna(0) == 1
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Desvio ≥ 30% da mediana do cluster"
        df_erros["campo"] = "price"
        df_erros["valor"] = "Preço: " + df_erros["price"].fillna(0).round(2).astype(str) + " | Empreendimentos: " + df["cluster_buildings"].astype(str)
        df_erros["grupo"] = "Preço"
        dados_errados.append(df_erros)

    filtro1 = abs((df["price_private_area"].fillna(0) / df["city_price_m2_median"].fillna(0)) - 1) >= 0.30
    filtro2 = df["cluster_buildings"].fillna(0) > 1
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Desvio ≥ 30% da mediana do cluster"
        df_erros["campo"] = "price_private_area"
        df_erros["valor"] = "Preço/m²: " + df_erros["price_private_area"].fillna(0).round(2).astype(str) + " | Mediana cluster: " + df_erros["city_price_m2_median"].fillna(0).round(2).astype(str) + " | Empreendimentos: " + df["cluster_buildings"].astype(str)
        df_erros["grupo"] = "Preço"
        dados_errados.append(df_erros)

    filtro1 = df["price_private_area"].fillna(0) < 10
    filtro2 = df["cluster_buildings"].fillna(0) == 1
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Desvio ≥ 30% da mediana do cluster"
        df_erros["campo"] = "price_private_area"
        df_erros["valor"] = "Preço/m²: " + df_erros["price_private_area"].fillna(0).round(2).astype(str) + " | Empreendimentos: " + df["cluster_buildings"].astype(str)
        df_erros["grupo"] = "Preço"
        dados_errados.append(df_erros)

    filtro1 = df["has_garage"] == True
    filtro2 = df["price"].fillna(0).round(0) <= df["avg_ticket_no_garage"].fillna(0).round(0)
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Preço com vaga ≤ Preço sem vaga"
        df_erros["campo"] = "price"
        df_erros["valor"] = "Com vagas: " + df_erros["price"].astype(str) + " | Sem vagas: " + df_erros["avg_ticket_no_garage"].astype(str) + " | Empreendimentos: " + df["cluster_buildings"].astype(str)
        df_erros["grupo"] = "Preço"
        dados_errados.append(df_erros)

    filtro1 = df["has_garage"] == True
    filtro2 = df["price_private_area"].fillna(0).round(0) <= df["avg_price_m2_no_garage"].fillna(0).round(0)
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Preço/m² com vaga ≤ Preço/m² sem vaga"
        df_erros["campo"] = "price_private_area"
        df_erros["valor"] = "Com vagas: " + df_erros["price_private_area"].astype(str) + " | Sem vagas: " + df_erros["avg_price_m2_no_garage"].astype(str) + " | Empreendimentos: " + df["cluster_buildings"].astype(str)
        df_erros["grupo"] = "Preço"
        dados_errados.append(df_erros)

    filtro1 = df["type_of_typology"] == "Garden"
    filtro2 = df["price"].fillna(0).round(0) >= df["standard_ticket"].fillna(0).round(0)
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Ticket Garden ≥ Ticket Padrão"
        df_erros["campo"] = "price"
        df_erros["valor"] = "Garden: " + df_erros["price"].fillna(0).round(2).astype(str) + " | Padrão: " + df_erros["standard_ticket"].fillna(0).round(2).astype(str)
        df_erros["grupo"] = "Preço"
        dados_errados.append(df_erros)

    filtro1 = df["type_of_typology"] == "Cobertura"
    filtro2 = df["price"].fillna(0).round(0) <= df["standard_ticket"].fillna(0).round(0)
    filtro = (filtro1) & (filtro2)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Ticket Cobertura ≤ Ticket Padrão"
        df_erros["campo"] = "price"
        df_erros["valor"] = "Cobertura: " + df_erros["price"].fillna(0).round(2).astype(str) + " | Padrão: " + df_erros["standard_ticket"].fillna(0).round(2).astype(str)
        df_erros["grupo"] = "Preço"
        dados_errados.append(df_erros)

    filtro1 = df["building_type"] == "Vertical"
    filtro2 = df["standard"] == "Econômico"
    filtro3 = ~df["garage"].str.contains(r"0|1\s*vagas?", case=False, na=False, regex=True)
    filtro = (filtro1) & (filtro2) & (filtro3)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Vertical Econômico com mais de 1 vaga"
        df_erros["campo"] = "garage"
        df_erros["valor"] = "Vagas: " + df_erros["garage"].fillna(0).astype(str) + " | M2: " + df["standard"].fillna("").astype(str)
        df_erros["grupo"] = "Vagas"
        dados_errados.append(df_erros)

    filtro1 = df["building_type"] == "Vertical"
    filtro2 = df["private_area"] >= 150
    filtro3 = df["garage"].str.contains(r"0|1\s*vagas?", case=False, na=False, regex=True)
    filtro = (filtro1) & (filtro2) & (filtro3)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Vertical ≥ 150 m² com menos de 2 vagas"
        df_erros["campo"] = "garage"
        df_erros["valor"] = "Vagas: " + df_erros["garage"].fillna(0).astype(str) + " | M2: " + df["private_area"].fillna(0).round(2).astype(str)
        df_erros["grupo"] = "Vagas"
        dados_errados.append(df_erros)

    filtro1 = df["building_type"] == "Vertical"
    filtro2 = df["standard"] == "Compacto"
    filtro3 = df["private_area"].fillna(0) >= 40
    filtro4 = df["garage"].str.contains(r"0\s*vagas?", case=False, na=False, regex=True)
    filtro = (filtro1) & (filtro2) & (filtro3) & (filtro4)
    if filtro.any():
        df_erros = df.loc[filtro].copy()
        df_erros["erro"] = "Vertical Compacto ≥ 40 m² sem vaga"
        df_erros["campo"] = "garage"
        df_erros["valor"] = "Vagas: " + df_erros["garage"].fillna(0).astype(str) + " | M2: " + df["private_area"].fillna(0).round(2).astype(str)
        df_erros["grupo"] = "Vagas"
        dados_errados.append(df_erros)

    return dados_errados


def gerar_relatorio(analise_historica: bool):
    df_convertido = ler_arquivos_json(analise_historica)

    Path(ARQ_DIVERGENCIAS).parent.mkdir(parents=True, exist_ok=True)
    df_convertido.to_excel(f"./output/farol/convertido_{PARAM_CIDADE.lower()}_{timestamp_arquivo}.xlsx", index=False)
    # return 0

    dados_errados = []

    err_empreendimentos = validar_empreendimentos_grupos(df_convertido.copy())
    dados_errados.extend(err_empreendimentos)

    err_tipologias = validar_tipologias_grupos(df_convertido.copy())
    dados_errados.extend(err_tipologias)

    df_erros = converter_dataframes(dados_errados)

    df_final = finalizar_tratamentos(df_erros.copy())

    Path(ARQ_DIVERGENCIAS).parent.mkdir(parents=True, exist_ok=True)
    df_final.to_excel(ARQ_DIVERGENCIAS, index=False)

    print("✅ FINALIZADO ✅")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gera relatório de divergências por cidade ou UF.")

    parser.add_argument(
        "--cidades",
        nargs="+",
        default=[],
        help="Uma ou mais cidades ou UFs para processar.",
    )

    parser.add_argument("--historico", type=bool, default=False, help="Analise histórica da tipologia")

    parser.add_argument("--iqr", type=float, default=1.5, help="Parâmetro do IQR")
    parser.add_argument("--q1", type=float, default=0.25, help="Percentil Q1")
    parser.add_argument("--q3", type=float, default=0.75, help="Percentil Q3")
    parser.add_argument("--zs", type=float, default=3.50, help="Parâmetro do Z-Score")

    args = parser.parse_args()

    lista_cidades = args.cidades

    if args.cidades == []:
        lista_cidades = [
            "AP",
            "DF",
            "RR",
            "AC",
            "MS",
            "AM",
            "RO",
            "TO",
            "SE",
            "MT",
            "ES",
            "PI",
            "MA",
            "PA",
            "RN",
            "RJ",
            "BA",
            "PB",
            "AL",
            "CE",
            "PE",
            "GO",
            "PR",
            "SC",
            "RS",
            "MG",
            "SP",
        ]

    PARAM_IQR = args.iqr
    PARAM_Q1 = args.q1
    PARAM_Q3 = args.q3
    PARAM_ZS = args.zs
    PARAM_HISTORICO = args.historico

    qtd_cidades = len(lista_cidades)
    i = 1

    for item in lista_cidades:
        print(f"\n=== ANALISANDO {i} de {qtd_cidades} ===")

        PARAM_CIDADE = item

        if len(PARAM_CIDADE) == 2:
            PARAM_CAMINHO = f"./database/uf/{PARAM_CIDADE.lower()}/"
        else:
            PARAM_CAMINHO = rf"./database/cidade/{PARAM_CIDADE.lower()}/"

        ARQ_DIVERGENCIAS = f"./output/farol/divergencias_{PARAM_CIDADE.lower()}_{timestamp_arquivo}_novo.xlsx"

        gerar_relatorio(PARAM_HISTORICO)

        if i < qtd_cidades:
            i += 1
