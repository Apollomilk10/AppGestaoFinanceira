// Sugestão automática de categoria/subcategoria a partir da descrição
// digitada, usando correspondência simples de palavras-chave. Não usa IA
// paga — é só um dicionário local.

const REGRAS = [
  // Obra - Reforma
  { palavras: ['cimento', 'areia', 'brita', 'tijolo', 'bloco', 'argamassa', 'reboco'], categoria: 'obra_reforma', etapa: 'alvenaria' },
  { palavras: ['fio', 'cabo', 'disjuntor', 'tomada', 'interruptor', 'eletricista', 'quadro de luz'], categoria: 'obra_reforma', etapa: 'eletrica' },
  { palavras: ['cano', 'tubo', 'registro', 'torneira', 'encanador', 'hidraulica', 'hidráulica'], categoria: 'obra_reforma', etapa: 'hidraulica' },
  { palavras: ['tinta', 'pincel', 'rolo', 'piso', 'porcelanato', 'rejunte', 'acabamento'], categoria: 'obra_reforma', etapa: 'acabamento' },
  { palavras: ['pedreiro', 'diária', 'diaria', 'mão de obra', 'mao de obra', 'servente'], categoria: 'obra_reforma', etapa: 'mao_de_obra' },

  // Moradia
  { palavras: ['aluguel'], categoria: 'moradia', etapa: 'aluguel' },
  { palavras: ['condomínio', 'condominio'], categoria: 'moradia', etapa: 'condominio' },
  { palavras: ['luz', 'energia', 'eletricidade'], categoria: 'moradia', etapa: 'energia' },
  { palavras: ['água', 'agua', 'saneamento'], categoria: 'moradia', etapa: 'agua' },
  { palavras: ['internet', 'wifi', 'wi-fi', 'fibra'], categoria: 'moradia', etapa: 'internet' },

  // Alimentação
  { palavras: ['mercado', 'supermercado', 'feira', 'hortifruti'], categoria: 'alimentacao', etapa: 'mercado' },
  { palavras: ['restaurante', 'almoço', 'almoco', 'jantar', 'lanchonete'], categoria: 'alimentacao', etapa: 'restaurante' },
  { palavras: ['ifood', 'delivery', 'entrega de comida'], categoria: 'alimentacao', etapa: 'delivery' },

  // Transporte
  { palavras: ['gasolina', 'combustível', 'combustivel', 'álcool', 'alcool', 'posto'], categoria: 'transporte', etapa: 'combustivel' },
  { palavras: ['uber', '99', 'taxi', 'táxi'], categoria: 'transporte', etapa: 'app_transporte' },
  { palavras: ['mecânico', 'mecanico', 'revisão', 'revisao', 'oficina'], categoria: 'transporte', etapa: 'manutencao' },
  { palavras: ['ônibus', 'onibus', 'metrô', 'metro', 'passagem'], categoria: 'transporte', etapa: 'transporte_publico' },

  // Saúde
  { palavras: ['consulta', 'médico', 'medico', 'dentista'], categoria: 'saude', etapa: 'consultas' },
  { palavras: ['farmácia', 'farmacia', 'remédio', 'remedio'], categoria: 'saude', etapa: 'farmacia' },
  { palavras: ['plano de saúde', 'plano de saude'], categoria: 'saude', etapa: 'plano_saude' },

  // Lazer
  { palavras: ['netflix', 'spotify', 'streaming', 'assinatura'], categoria: 'lazer', etapa: 'streaming' },
  { palavras: ['viagem', 'hotel', 'passagem aérea', 'passagem aerea'], categoria: 'lazer', etapa: 'viagem' },

  // Compras
  { palavras: ['roupa', 'camisa', 'calça', 'calca', 'sapato'], categoria: 'compras', etapa: 'roupas' },
  { palavras: ['celular', 'notebook', 'eletrônico', 'eletronico'], categoria: 'compras', etapa: 'eletronicos' },
];

export function sugerirCategoria(descricao) {
  if (!descricao) return null;
  const texto = descricao.toLowerCase();

  for (const regra of REGRAS) {
    if (regra.palavras.some((p) => texto.includes(p))) {
      return { categoria: regra.categoria, etapa: regra.etapa };
    }
  }
  return null;
}
