
// Banco de dados simplificado de Aeroportos (Principais BR e Mundo)
// Chaves normalizadas (sem acento, minúsculas) para facilitar a busca

const AIRPORT_DB: Record<string, string> = {
    // BRASIL - SUL
    "curitiba": "CWB",
    "sao jose dos pinhais": "CWB",
    "florianopolis": "FLN",
    "porto alegre": "POA",
    "foz do iguacu": "IGU",
    "londrina": "LDB",
    "maringa": "MGF",
    "navegantes": "NVT",
    "joinville": "JOI",
    "chapeco": "XAP",
    "caxias do sul": "CXJ",
    "pelotas": "PET",

    // BRASIL - SUDESTE
    "sao paulo": "GRU", // Default GRU, poderia ser CGH/VCP
    "guarulhos": "GRU",
    "congonhas": "CGH",
    "campinas": "VCP",
    "viracopos": "VCP",
    "rio de janeiro": "GIG", // Default GIG
    "galeao": "GIG",
    "santos dumont": "SDU",
    "belo horizonte": "CNF",
    "confins": "CNF",
    "vitoria": "VIX",
    "uberlandia": "UDI",
    "ribeirao preto": "RAO",

    // BRASIL - CENTRO-OESTE
    "brasilia": "BSB",
    "goiania": "GYN",
    "cuiaba": "CGB",
    "campo grande": "CGR",

    // BRASIL - NORDESTE
    "salvador": "SSA",
    "recife": "REC",
    "fortaleza": "FOR",
    "natal": "NAT",
    "joao pessoa": "JPA",
    "maceio": "MCZ",
    "aracaju": "AJU",
    "sao luis": "SLZ",
    "teresina": "THE",
    "porto seguro": "BPS",

    // BRASIL - NORTE
    "manaus": "MAO",
    "belem": "BEL",
    "palmas": "PMW",
    "porto velho": "PVH",
    "rio branco": "RBR",
    "macapa": "MCP",
    "boa vista": "BVB",

    // INTERNACIONAL - AMÉRICA DO SUL
    "buenos aires": "EZE",
    "santiago": "SCL",
    "montevideu": "MVD",
    "lima": "LIM",
    "bogota": "BOG",
    "assuncao": "ASU",

    // INTERNACIONAL - EUA
    "miami": "MIA",
    "orlando": "MCO",
    "nova york": "JFK",
    "new york": "JFK",
    "los angeles": "LAX",
    "las vegas": "LAS",
    "chicago": "ORD",
    "atlanta": "ATL",
    "houston": "IAH",
    "dallas": "DFW",

    // INTERNACIONAL - EUROPA
    "lisboa": "LIS",
    "porto": "OPO",
    "madri": "MAD",
    "barcelona": "BCN",
    "paris": "CDG",
    "londres": "LHR",
    "roma": "FCO",
    "milao": "MXP",
    "amsterdam": "AMS",
    "frankfurt": "FRA",
    "munique": "MUC",
    "zurique": "ZRH",

    // INTERNACIONAL - OUTROS
    "dubai": "DXB",
    "doha": "DOH",
    "tel aviv": "TLV",
    "cairo": "CAI",
    "istambul": "IST",
    "toquio": "NRT",
    "sydney": "SYD"
};

/**
 * Busca o código IATA baseado no nome da cidade.
 * Remove acentos e converte para minúsculas antes de buscar.
 */
export const getIataFromCity = (city: string): string | null => {
    if (!city) return null;
    
    // Normaliza: Remove acentos e caracteres especiais, converte para minúsculo e remove espaços extras
    const normalizedCity = city
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    return AIRPORT_DB[normalizedCity] || null;
};
