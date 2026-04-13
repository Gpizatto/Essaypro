// Modelos de critérios pré-definidos para criação de propostas
export const CRITERIA_MODELS = {
  enem: {
    name: 'Modelo ENEM',
    description: 'Padrão ENEM com 5 competências',
    criteria: [
      { id: 'c1', nome: 'Competência 1 — Domínio da Norma Culta', descricao: 'Demonstrar domínio da modalidade escrita formal da língua portuguesa', peso_maximo: 200, level_descriptions: [{"pontuacao": 0, "proficiencia": "Nível 0 — Muito baixa ou ausente", "descricao": "Desconhecimento da norma padrão, aproximando o texto à oralidade."}, {"pontuacao": 40, "proficiencia": "Nível I — Baixa", "descricao": "Domínio insuficiente com graves e frequentes desvios gramaticais e de convenções da escrita."}, {"pontuacao": 80, "proficiencia": "Nível II — Mediana", "descricao": "Domínio mediano com vários desvios gramaticais e de convenções da escrita."}, {"pontuacao": 120, "proficiencia": "Nível III — Boa", "descricao": "Domínio adequado com alguns desvios gramaticais e de convenções da escrita."}, {"pontuacao": 160, "proficiencia": "Nível IV — Muito boa", "descricao": "Bom domínio com poucos desvios gramaticais e de convenções da escrita."}, {"pontuacao": 200, "proficiencia": "Nível V — Excelente", "descricao": "Excelente domínio, não apresentando ou apresentando escassos desvios gramaticais."}] },
      { id: 'c2', nome: 'Competência 2 — Compreensão do Tema', descricao: 'Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento', peso_maximo: 200, level_descriptions: [{"pontuacao": 0, "proficiencia": "Nível 0 — Fuga ao tema", "descricao": "Fuga ao tema ou não atendimento à estrutura dissertativo-argumentativa."}, {"pontuacao": 40, "proficiencia": "Nível I — Precário", "descricao": "Tema apresentado de forma tangencial com grave inadequação ao tipo textual."}, {"pontuacao": 80, "proficiencia": "Nível II — Insuficiente", "descricao": "Desenvolve o tema recorrendo a cópia dos textos motivadores ou com domínio precário do tipo textual."}, {"pontuacao": 120, "proficiencia": "Nível III — Mediano", "descricao": "Argumentação previsível e domínio mediano do tipo textual dissertativo-argumentativo."}, {"pontuacao": 160, "proficiencia": "Nível IV — Bom", "descricao": "Argumentação consistente e bom domínio do tipo textual, com poucos desvios."}, {"pontuacao": 200, "proficiencia": "Nível V — Excelente", "descricao": "Argumentação consistente com repertório sociocultural produtivo e excelente domínio do tipo textual."}] },
      { id: 'c3', nome: 'Competência 3 — Argumentação', descricao: 'Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos', peso_maximo: 200, level_descriptions: [{"pontuacao": 0, "proficiencia": "Nível 0 — Ausente", "descricao": "Informações não relacionadas ao tema, sem defesa de ponto de vista."}, {"pontuacao": 40, "proficiencia": "Nível I — Precário", "descricao": "Informações pouco relacionadas ou incoerentes, sem configurar defesa de ponto de vista."}, {"pontuacao": 80, "proficiencia": "Nível II — Insuficiente", "descricao": "Argumentos limitados aos textos motivadores, configurando parcialmente uma defesa de ponto de vista."}, {"pontuacao": 120, "proficiencia": "Nível III — Mediano", "descricao": "Defesa de ponto de vista organizada, com argumentação previsível."}, {"pontuacao": 160, "proficiencia": "Nível IV — Bom", "descricao": "Defesa de ponto de vista organizada e com indícios de autoria."}, {"pontuacao": 200, "proficiencia": "Nível V — Excelente", "descricao": "Defesa de ponto de vista consistente, organizada e com autoria evidente."}] },
      { id: 'c4', nome: 'Competência 4 — Coesão e Coerência', descricao: 'Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação', peso_maximo: 200, level_descriptions: [{"pontuacao": 0, "proficiencia": "Nível 0 — Ausente", "descricao": "Não articula as informações. Ausência de elementos coesivos."}, {"pontuacao": 40, "proficiencia": "Nível I — Precário", "descricao": "Articulação precária das partes do texto."}, {"pontuacao": 80, "proficiencia": "Nível II — Insuficiente", "descricao": "Articulação insuficiente com muitas inadequações e repertório coesivo limitado."}, {"pontuacao": 120, "proficiencia": "Nível III — Mediano", "descricao": "Articulação mediana com inadequações e repertório coesivo pouco diversificado."}, {"pontuacao": 160, "proficiencia": "Nível IV — Bom", "descricao": "Articulação com poucas inadequações e repertório coesivo diversificado."}, {"pontuacao": 200, "proficiencia": "Nível V — Excelente", "descricao": "Boa articulação com repertório coesivo diversificado e bem empregado."}] },
      { id: 'c5', nome: 'Competência 5 — Proposta de Intervenção', descricao: 'Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos', peso_maximo: 200, level_descriptions: [{"pontuacao": 0, "proficiencia": "Nível 0 — Ausente", "descricao": "Proposta ausente ou não relacionada ao tema."}, {"pontuacao": 40, "proficiencia": "Nível I — Precário", "descricao": "Proposta vaga ou relacionada apenas ao assunto, sem articulação com o tema."}, {"pontuacao": 80, "proficiencia": "Nível II — Insuficiente", "descricao": "Proposta relacionada ao tema, mas não articulada com a discussão do texto."}, {"pontuacao": 120, "proficiencia": "Nível III — Mediano", "descricao": "Proposta relacionada ao tema e medianamente articulada à discussão."}, {"pontuacao": 160, "proficiencia": "Nível IV — Bom", "descricao": "Proposta bem articulada, considerando a complexidade sociocultural do problema."}, {"pontuacao": 200, "proficiencia": "Nível V — Excelente", "descricao": "Proposta detalhada, articulada e que considera a complexidade sociocultural do problema."}] }
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
