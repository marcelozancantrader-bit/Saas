/**
 * Top municípios brasileiros (capitais + cidades grandes e médias).
 * Usado como datalist de autocomplete no dialog de zoneamento custom.
 *
 * Cobre ~70% da população urbana brasileira. Pra municípios fora da lista
 * o user pode digitar livre — o autocomplete é só sugestão.
 */

export type Municipio = { nome: string; uf: string };

export const MUNICIPIOS_BR: Municipio[] = [
  // ===== CAPITAIS (27) =====
  { nome: "Rio Branco", uf: "AC" },
  { nome: "Maceió", uf: "AL" },
  { nome: "Macapá", uf: "AP" },
  { nome: "Manaus", uf: "AM" },
  { nome: "Salvador", uf: "BA" },
  { nome: "Fortaleza", uf: "CE" },
  { nome: "Brasília", uf: "DF" },
  { nome: "Vitória", uf: "ES" },
  { nome: "Goiânia", uf: "GO" },
  { nome: "São Luís", uf: "MA" },
  { nome: "Cuiabá", uf: "MT" },
  { nome: "Campo Grande", uf: "MS" },
  { nome: "Belo Horizonte", uf: "MG" },
  { nome: "Belém", uf: "PA" },
  { nome: "João Pessoa", uf: "PB" },
  { nome: "Curitiba", uf: "PR" },
  { nome: "Recife", uf: "PE" },
  { nome: "Teresina", uf: "PI" },
  { nome: "Rio de Janeiro", uf: "RJ" },
  { nome: "Natal", uf: "RN" },
  { nome: "Porto Alegre", uf: "RS" },
  { nome: "Porto Velho", uf: "RO" },
  { nome: "Boa Vista", uf: "RR" },
  { nome: "Florianópolis", uf: "SC" },
  { nome: "São Paulo", uf: "SP" },
  { nome: "Aracaju", uf: "SE" },
  { nome: "Palmas", uf: "TO" },

  // ===== SÃO PAULO (grandes municípios) =====
  { nome: "Campinas", uf: "SP" },
  { nome: "Guarulhos", uf: "SP" },
  { nome: "São Bernardo do Campo", uf: "SP" },
  { nome: "Santo André", uf: "SP" },
  { nome: "Osasco", uf: "SP" },
  { nome: "São José dos Campos", uf: "SP" },
  { nome: "Ribeirão Preto", uf: "SP" },
  { nome: "Sorocaba", uf: "SP" },
  { nome: "Santos", uf: "SP" },
  { nome: "Mauá", uf: "SP" },
  { nome: "São José do Rio Preto", uf: "SP" },
  { nome: "Mogi das Cruzes", uf: "SP" },
  { nome: "Diadema", uf: "SP" },
  { nome: "Jundiaí", uf: "SP" },
  { nome: "Piracicaba", uf: "SP" },
  { nome: "Carapicuíba", uf: "SP" },
  { nome: "Bauru", uf: "SP" },
  { nome: "Itaquaquecetuba", uf: "SP" },
  { nome: "São Vicente", uf: "SP" },
  { nome: "Franca", uf: "SP" },
  { nome: "Praia Grande", uf: "SP" },
  { nome: "Guarujá", uf: "SP" },
  { nome: "Limeira", uf: "SP" },
  { nome: "Suzano", uf: "SP" },
  { nome: "Taubaté", uf: "SP" },
  { nome: "Embu das Artes", uf: "SP" },
  { nome: "Sumaré", uf: "SP" },
  { nome: "Barueri", uf: "SP" },
  { nome: "Indaiatuba", uf: "SP" },
  { nome: "Cotia", uf: "SP" },
  { nome: "Americana", uf: "SP" },
  { nome: "Marília", uf: "SP" },
  { nome: "São Carlos", uf: "SP" },
  { nome: "Hortolândia", uf: "SP" },
  { nome: "Presidente Prudente", uf: "SP" },
  { nome: "Rio Claro", uf: "SP" },
  { nome: "Itapevi", uf: "SP" },

  // ===== RIO DE JANEIRO =====
  { nome: "São Gonçalo", uf: "RJ" },
  { nome: "Duque de Caxias", uf: "RJ" },
  { nome: "Nova Iguaçu", uf: "RJ" },
  { nome: "Niterói", uf: "RJ" },
  { nome: "Belford Roxo", uf: "RJ" },
  { nome: "Campos dos Goytacazes", uf: "RJ" },
  { nome: "São João de Meriti", uf: "RJ" },
  { nome: "Petrópolis", uf: "RJ" },
  { nome: "Volta Redonda", uf: "RJ" },
  { nome: "Magé", uf: "RJ" },
  { nome: "Macaé", uf: "RJ" },
  { nome: "Itaboraí", uf: "RJ" },
  { nome: "Cabo Frio", uf: "RJ" },
  { nome: "Nova Friburgo", uf: "RJ" },
  { nome: "Angra dos Reis", uf: "RJ" },
  { nome: "Resende", uf: "RJ" },

  // ===== MINAS GERAIS =====
  { nome: "Uberlândia", uf: "MG" },
  { nome: "Contagem", uf: "MG" },
  { nome: "Juiz de Fora", uf: "MG" },
  { nome: "Betim", uf: "MG" },
  { nome: "Montes Claros", uf: "MG" },
  { nome: "Ribeirão das Neves", uf: "MG" },
  { nome: "Uberaba", uf: "MG" },
  { nome: "Governador Valadares", uf: "MG" },
  { nome: "Ipatinga", uf: "MG" },
  { nome: "Sete Lagoas", uf: "MG" },
  { nome: "Divinópolis", uf: "MG" },
  { nome: "Santa Luzia", uf: "MG" },
  { nome: "Ibirité", uf: "MG" },
  { nome: "Poços de Caldas", uf: "MG" },

  // ===== RIO GRANDE DO SUL =====
  { nome: "Caxias do Sul", uf: "RS" },
  { nome: "Canoas", uf: "RS" },
  { nome: "Pelotas", uf: "RS" },
  { nome: "Santa Maria", uf: "RS" },
  { nome: "Gravataí", uf: "RS" },
  { nome: "Viamão", uf: "RS" },
  { nome: "Novo Hamburgo", uf: "RS" },
  { nome: "São Leopoldo", uf: "RS" },
  { nome: "Rio Grande", uf: "RS" },
  { nome: "Alvorada", uf: "RS" },
  { nome: "Passo Fundo", uf: "RS" },
  { nome: "Sapucaia do Sul", uf: "RS" },

  // ===== PARANÁ =====
  { nome: "Londrina", uf: "PR" },
  { nome: "Maringá", uf: "PR" },
  { nome: "Ponta Grossa", uf: "PR" },
  { nome: "Cascavel", uf: "PR" },
  { nome: "São José dos Pinhais", uf: "PR" },
  { nome: "Foz do Iguaçu", uf: "PR" },
  { nome: "Colombo", uf: "PR" },
  { nome: "Guarapuava", uf: "PR" },
  { nome: "Paranaguá", uf: "PR" },
  { nome: "Araucária", uf: "PR" },
  { nome: "Toledo", uf: "PR" },
  { nome: "Apucarana", uf: "PR" },

  // ===== SANTA CATARINA =====
  { nome: "Joinville", uf: "SC" },
  { nome: "Blumenau", uf: "SC" },
  { nome: "São José", uf: "SC" },
  { nome: "Chapecó", uf: "SC" },
  { nome: "Itajaí", uf: "SC" },
  { nome: "Criciúma", uf: "SC" },
  { nome: "Lages", uf: "SC" },
  { nome: "Balneário Camboriú", uf: "SC" },
  { nome: "Palhoça", uf: "SC" },
  { nome: "Jaraguá do Sul", uf: "SC" },

  // ===== BAHIA =====
  { nome: "Feira de Santana", uf: "BA" },
  { nome: "Vitória da Conquista", uf: "BA" },
  { nome: "Camaçari", uf: "BA" },
  { nome: "Itabuna", uf: "BA" },
  { nome: "Juazeiro", uf: "BA" },
  { nome: "Lauro de Freitas", uf: "BA" },
  { nome: "Ilhéus", uf: "BA" },
  { nome: "Jequié", uf: "BA" },

  // ===== CEARÁ =====
  { nome: "Caucaia", uf: "CE" },
  { nome: "Juazeiro do Norte", uf: "CE" },
  { nome: "Maracanaú", uf: "CE" },
  { nome: "Sobral", uf: "CE" },
  { nome: "Crato", uf: "CE" },

  // ===== PERNAMBUCO =====
  { nome: "Jaboatão dos Guararapes", uf: "PE" },
  { nome: "Olinda", uf: "PE" },
  { nome: "Caruaru", uf: "PE" },
  { nome: "Petrolina", uf: "PE" },
  { nome: "Paulista", uf: "PE" },

  // ===== PARÁ =====
  { nome: "Ananindeua", uf: "PA" },
  { nome: "Santarém", uf: "PA" },
  { nome: "Marabá", uf: "PA" },
  { nome: "Castanhal", uf: "PA" },
  { nome: "Parauapebas", uf: "PA" },

  // ===== GOIÁS =====
  { nome: "Aparecida de Goiânia", uf: "GO" },
  { nome: "Anápolis", uf: "GO" },
  { nome: "Rio Verde", uf: "GO" },
  { nome: "Luziânia", uf: "GO" },

  // ===== MARANHÃO =====
  { nome: "Imperatriz", uf: "MA" },
  { nome: "Timon", uf: "MA" },
  { nome: "Caxias", uf: "MA" },

  // ===== AMAZONAS =====
  { nome: "Parintins", uf: "AM" },
  { nome: "Itacoatiara", uf: "AM" },

  // ===== ESPÍRITO SANTO =====
  { nome: "Vila Velha", uf: "ES" },
  { nome: "Serra", uf: "ES" },
  { nome: "Cariacica", uf: "ES" },
  { nome: "Cachoeiro de Itapemirim", uf: "ES" },
  { nome: "Linhares", uf: "ES" },

  // ===== MATO GROSSO =====
  { nome: "Várzea Grande", uf: "MT" },
  { nome: "Rondonópolis", uf: "MT" },
  { nome: "Sinop", uf: "MT" },

  // ===== MATO GROSSO DO SUL =====
  { nome: "Dourados", uf: "MS" },
  { nome: "Três Lagoas", uf: "MS" },

  // ===== PARAÍBA =====
  { nome: "Campina Grande", uf: "PB" },
  { nome: "Santa Rita", uf: "PB" },
  { nome: "Patos", uf: "PB" },

  // ===== ALAGOAS =====
  { nome: "Arapiraca", uf: "AL" },
  { nome: "Palmeira dos Índios", uf: "AL" },

  // ===== RIO GRANDE DO NORTE =====
  { nome: "Mossoró", uf: "RN" },
  { nome: "Parnamirim", uf: "RN" },

  // ===== PIAUÍ =====
  { nome: "Parnaíba", uf: "PI" },
  { nome: "Picos", uf: "PI" },

  // ===== TOCANTINS =====
  { nome: "Araguaína", uf: "TO" },
  { nome: "Gurupi", uf: "TO" },

  // ===== RONDÔNIA =====
  { nome: "Ji-Paraná", uf: "RO" },
  { nome: "Ariquemes", uf: "RO" },

  // ===== ACRE =====
  { nome: "Cruzeiro do Sul", uf: "AC" },

  // ===== AMAPÁ =====
  { nome: "Santana", uf: "AP" },

  // ===== RORAIMA =====
  { nome: "Rorainópolis", uf: "RR" },

  // ===== SERGIPE =====
  { nome: "Nossa Senhora do Socorro", uf: "SE" },
  { nome: "Itabaiana", uf: "SE" },
];

/** Retorna `${nome}/${uf}` pra usar como value único de datalist. */
export function municipioDisplay(m: Municipio): string {
  return `${m.nome}/${m.uf}`;
}

/** Parse de "Nome da Cidade/UF" → { nome, uf }. Retorna null se inválido. */
export function parseMunicipioDisplay(s: string): Municipio | null {
  const m = s.match(/^(.+?)\/([A-Z]{2})$/);
  if (!m) return null;
  return { nome: m[1]!.trim(), uf: m[2]! };
}
