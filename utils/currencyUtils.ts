
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const numberToExtenso = (v: number): string => {
  if (v === 0) return "zero reais";

  const unidade = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezena = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const dezena10 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const centena = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  const compile = (n: number): string => {
    if (n < 10) return unidade[n];
    if (n < 20) return dezena10[n - 10];
    if (n < 100) {
      const u = n % 10;
      return dezena[Math.floor(n / 10)] + (u ? " e " + unidade[u] : "");
    }
    if (n < 1000) {
      if (n === 100) return "cem";
      const d = n % 100;
      return centena[Math.floor(n / 100)] + (d ? " e " + compile(d) : "");
    }
    return "";
  };

  const parts: string[] = [];
  const value = Math.floor(v);
  const cents = Math.round((v - value) * 100);

  // Tratamento simplificado até Milhão para contratos de viagem
  let r = value;
  
  // Milhões
  const milhoes = Math.floor(r / 1000000);
  r %= 1000000;
  if (milhoes > 0) {
    parts.push(compile(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
  }

  // Milhares
  const milhares = Math.floor(r / 1000);
  r %= 1000;
  if (milhares > 0) {
    if (parts.length > 0 && r === 0) parts.push("e"); // Conector
    parts.push((milhares === 1 ? "um" : compile(milhares)) + " mil"); // "um mil" ou "dois mil"
  }

  // Centenas
  if (r > 0) {
    if (parts.length > 0) parts.push("e");
    parts.push(compile(r));
  }

  let text = parts.join(" ");
  if (value === 1) text += " real";
  else if (value > 1) text += " reais";

  if (cents > 0) {
    text += " e " + compile(cents);
    if (cents === 1) text += " centavo";
    else text += " centavos";
  }

  return text;
};
