// Modelos de critérios pré-definidos para criação de propostas
export const CRITERIA_MODELS = {
  enem: {
    name: 'Modelo ENEM',
    description: 'Padrão ENEM com 5 competências',
    criteria: [
      { id: 'c1', nome: 'Competência 1 — Domínio da Norma Culta', descricao: 'Demonstrar domínio da modalidade escrita formal da língua portuguesa', peso_maximo: 200 },
      { id: 'c2', nome: 'Competência 2 — Compreensão do Tema', descricao: 'Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento', peso_maximo: 200 },
      { id: 'c3', nome: 'Competência 3 — Argumentação', descricao: 'Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos', peso_maximo: 200 },
      { id: 'c4', nome: 'Competência 4 — Coesão e Coerência', descricao: 'Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação', peso_maximo: 200 },
      { id: 'c5', nome: 'Competência 5 — Proposta de Intervenção', descricao: 'Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos', peso_maximo: 200 }
    ]
  },
  dissertacao_escolar: {
    name: 'Dissertação Argumentativa Escolar',
    description: 'Modelo para redações escolares',
    criteria: [
      { id: 'intro', nome: 'Introdução e Tese', descricao: 'Apresentação clara do tema e da tese defendida', peso_maximo: 200 },
      { id: 'desenv', nome: 'Desenvolvimento e Argumentos', descricao: 'Qualidade dos argumentos e embasamento', peso_maximo: 280 },
      { id: 'concl', nome: 'Conclusão', descricao: 'Retomada da tese e fechamento do texto', peso_maximo: 160 },
      { id: 'coesao', nome: 'Coesão e Coerência', descricao: 'Articulação entre as partes do texto', peso_maximo: 80 },
      { id: 'norma', nome: 'Norma Culta', descricao: 'Correção gramatical e ortográfica', peso_maximo: 80 }
    ]
  },
  narrativo: {
    name: 'Texto Narrativo',
    description: 'Para redações narrativas',
    criteria: [
      { id: 'criativ', nome: 'Criatividade e Originalidade', descricao: 'Capacidade de criar uma história interessante e original', peso_maximo: 240 },
      { id: 'estrut', nome: 'Estrutura Narrativa', descricao: 'Organização do enredo (situação inicial, conflito, clímax, desfecho)', peso_maximo: 200 },
      { id: 'person', nome: 'Personagens e Ambiente', descricao: 'Desenvolvimento de personagens e descrição do cenário', peso_maximo: 160 },
      { id: 'coesao', nome: 'Coesão e Linguagem', descricao: 'Uso adequado de conectivos e linguagem narrativa', peso_maximo: 120 },
      { id: 'norma', nome: 'Norma Culta', descricao: 'Correção gramatical e ortográfica', peso_maximo: 80 }
    ]
  },
  descritivo: {
    name: 'Texto Descritivo',
    description: 'Para redações descritivas',
    criteria: [
      { id: 'detalhes', nome: 'Riqueza de Detalhes', descricao: 'Uso de adjetivos, advérbios e detalhes sensoriais', peso_maximo: 240 },
      { id: 'estrut', nome: 'Organização e Estrutura', descricao: 'Organização lógica da descrição', peso_maximo: 200 },
      { id: 'vocab', nome: 'Vocabulário e Estilo', descricao: 'Variedade lexical e estilo apropriado', peso_maximo: 200 },
      { id: 'norma', nome: 'Norma Culta', descricao: 'Correção gramatical e ortográfica', peso_maximo: 160 }
    ]
  },
  carta_opiniao: {
    name: 'Carta Argumentativa / Artigo de Opinião',
    description: 'Para cartas e artigos opinativos',
    criteria: [
      { id: 'adequacao', nome: 'Adequação ao Gênero', descricao: 'Respeito às características do gênero textual', peso_maximo: 160 },
      { id: 'argument', nome: 'Argumentação', descricao: 'Qualidade e consistência dos argumentos', peso_maximo: 240 },
      { id: 'proposta', nome: 'Proposta de Solução/Posicionamento', descricao: 'Clareza do posicionamento e propostas apresentadas', peso_maximo: 200 },
      { id: 'coesao', nome: 'Coesão e Coerência', descricao: 'Articulação das ideias', peso_maximo: 120 },
      { id: 'norma', nome: 'Norma Culta', descricao: 'Correção gramatical e ortográfica', peso_maximo: 80 }
    ]
  },
  personalizado: {
    name: 'Modelo Personalizado',
    description: 'Comece do zero',
    criteria: [
      { id: 'c1', nome: '', descricao: '', peso_maximo: 200 }
    ]
  }
};
