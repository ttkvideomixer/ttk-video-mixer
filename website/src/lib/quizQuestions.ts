import type { QuizQuestion } from '@/types/quiz'

/**
 * All 7 onboarding questions, their 6 ready-made answers and the short
 * personalized insight shown right after each pick. Kept as data (not spread
 * across JSX) so the quiz screen, tests and the scoring engine all read from
 * the same source of truth.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    number: 1,
    key: 'q1',
    question: 'Quantos vídeos você costuma produzir por dia?',
    options: [
      {
        index: 1,
        label: 'Ainda estou começando',
        feedback: 'Ótimo momento para criar um processo organizado antes de aumentar o volume.',
        scores: { volume: 0, consistency: 0 }
      },
      {
        index: 2,
        label: '1 a 2',
        feedback: 'Com um sistema de combinações, uma única sessão de gravação pode render muito mais conteúdo.',
        scores: { volume: 1 }
      },
      {
        index: 3,
        label: '3 a 5',
        feedback: 'Você já possui ritmo. Automatizar as combinações pode liberar bastante tempo.',
        scores: { volume: 2, consistency: 1 }
      },
      {
        index: 4,
        label: '6 a 10',
        feedback: 'Seu volume já é alto. Reduzir tarefas repetitivas começa a fazer muita diferença.',
        scores: { volume: 3, automation: 1 }
      },
      {
        index: 5,
        label: 'Mais de 10',
        feedback: 'Produção em escala exige processo. É exatamente aí que automação passa a ser importante.',
        scores: { volume: 4, automation: 1 }
      },
      {
        index: 6,
        label: 'Quero produzir muito mais do que hoje',
        feedback:
          'Então o objetivo é escala. O TTK VIDEO MIXER foi pensado exatamente para transformar poucos blocos em muitas combinações.',
        scores: { volume: 2, automation: 1 }
      }
    ]
  },
  {
    number: 2,
    key: 'q2',
    question: 'Qual é sua maior dificuldade hoje?',
    options: [
      {
        index: 1,
        label: 'Ter ideias de vídeos',
        feedback: 'Trabalhar com Ganchos, Corpos e CTAs separados facilita testar ideias sem refazer todo o vídeo.',
        scores: { variation: 2 }
      },
      {
        index: 2,
        label: 'Gravar muitos vídeos',
        feedback: 'Você não precisa gravar o vídeo completo todas as vezes. Pode reaproveitar blocos.',
        scores: { volume: 2 }
      },
      {
        index: 3,
        label: 'Editar tudo',
        feedback: 'O Mixer automatiza justamente uma grande parte dessa montagem repetitiva.',
        scores: { automation: 3 }
      },
      {
        index: 4,
        label: 'Manter constância',
        feedback: 'Quanto mais simples o processo, mais fácil manter uma rotina de produção.',
        scores: { consistency: 3 }
      },
      {
        index: 5,
        label: 'Criar variações',
        feedback: 'Variação é uma das ideias centrais do TTK VIDEO MIXER.',
        scores: { variation: 3 }
      },
      {
        index: 6,
        label: 'Fazer tudo isso ao mesmo tempo',
        feedback:
          'Esse é justamente o cenário em que organizar o conteúdo em blocos tende a gerar mais ganho de produtividade.',
        scores: { volume: 1, consistency: 1, variation: 1, automation: 1 }
      }
    ]
  },
  {
    number: 3,
    key: 'q3',
    question: 'Como você produz seus vídeos de TikTok Shop hoje?',
    options: [
      {
        index: 1,
        label: 'Gravo e posto na hora',
        feedback: 'Você já tem velocidade. O Mixer pode ajudar a multiplicar o que você grava antes da postagem.',
        scores: { volume: 1, consistency: 1 }
      },
      {
        index: 2,
        label: 'Gravo vários e edito depois',
        feedback: 'Seu método combina muito bem com produção em lote.',
        scores: { volume: 2, consistency: 1 }
      },
      {
        index: 3,
        label: 'Uso CapCut',
        feedback:
          'Você pode continuar usando o CapCut quando quiser. O Mixer resolve especificamente a geração combinatória em massa.',
        scores: { automation: 1, variation: 1 }
      },
      {
        index: 4,
        label: 'Tenho alguém que edita',
        feedback:
          'O Mixer pode reduzir tarefas mecânicas e deixar sua edição focada no que realmente precisa de intervenção humana.',
        scores: { automation: 2 }
      },
      {
        index: 5,
        label: 'Uso IA e automações',
        feedback: 'Você já pensa em escala. O Mixer adiciona uma camada específica de automação para criativos.',
        scores: { automation: 3, variation: 1 }
      },
      {
        index: 6,
        label: 'Ainda não tenho processo definido',
        feedback: 'Melhor ainda: você pode começar com um processo simples de Gancho + Corpo + CTA.',
        scores: { consistency: 0 }
      }
    ]
  },
  {
    number: 4,
    key: 'q4',
    question: 'O que mais importa para você agora?',
    options: [
      {
        index: 1,
        label: 'Produzir mais',
        feedback:
          'Produção em blocos permite aumentar muito a quantidade de outputs sem aumentar na mesma proporção as gravações.',
        scores: { volume: 3 }
      },
      {
        index: 2,
        label: 'Economizar tempo',
        feedback: 'Automatizar montagem repetitiva é justamente uma forma de recuperar tempo.',
        scores: { automation: 3 }
      },
      {
        index: 3,
        label: 'Testar mais Ganchos',
        feedback:
          'Com vários Ganchos combinados aos mesmos Corpos e CTAs, fica muito mais fácil criar testes.',
        scores: { variation: 3 }
      },
      {
        index: 4,
        label: 'Ter mais constância',
        feedback: 'Uma biblioteca pronta de vídeos ajuda a evitar ficar sem conteúdo.',
        scores: { consistency: 3 }
      },
      {
        index: 5,
        label: 'Testar mais produtos',
        feedback: 'Processos repetíveis facilitam trocar de produto sem reconstruir toda a operação.',
        scores: { variation: 2, volume: 1 }
      },
      {
        index: 6,
        label: 'Tudo isso',
        feedback:
          'Seu objetivo é uma operação de conteúdo mais escalável — exatamente o posicionamento do TTK VIDEO MIXER.',
        scores: { volume: 1, consistency: 1, variation: 1, automation: 1 }
      }
    ]
  },
  {
    number: 5,
    key: 'q5',
    question: 'Quantos produtos você pretende testar no TikTok Shop?',
    options: [
      {
        index: 1,
        label: 'Apenas 1 por enquanto',
        feedback: 'Mesmo com um único produto, diferentes Ganchos e CTAs permitem criar muitos ângulos.',
        scores: { variation: 0 }
      },
      {
        index: 2,
        label: '2 a 3',
        feedback: 'Com alguns produtos, organização já começa a ser importante.',
        scores: { variation: 1 }
      },
      {
        index: 3,
        label: '4 a 5',
        feedback: 'Você entra em um nível em que processos repetíveis economizam bastante tempo.',
        scores: { variation: 2 }
      },
      {
        index: 4,
        label: '6 a 10',
        feedback: 'Quanto mais produtos, maior a necessidade de uma esteira organizada de criativos.',
        scores: { variation: 3, volume: 1 }
      },
      {
        index: 5,
        label: 'Mais de 10',
        feedback: 'Seu cenário é claramente de produção em escala.',
        scores: { variation: 4, volume: 2 }
      },
      {
        index: 6,
        label: 'Quero testar produtos constantemente',
        feedback: 'O Mixer pode virar uma etapa fixa da sua operação: grava → combina → exporta → testa.',
        scores: { variation: 3, automation: 2 }
      }
    ]
  },
  {
    number: 6,
    key: 'q6',
    question: 'Quantas variações você normalmente cria para o mesmo produto?',
    options: [
      {
        index: 1,
        label: 'Apenas uma',
        feedback: 'Você pode estar deixando vários ângulos criativos sem teste.',
        scores: { variation: 0 }
      },
      {
        index: 2,
        label: '2 a 3',
        feedback: 'Separar Gancho, Corpo e CTA permite ampliar essas possibilidades rapidamente.',
        scores: { variation: 1 }
      },
      {
        index: 3,
        label: '4 a 5',
        feedback: 'Você já trabalha com variação. O Mixer pode acelerar bastante esse processo.',
        scores: { variation: 2 }
      },
      {
        index: 4,
        label: '6 a 10',
        feedback: 'Com esse nível de teste, automação começa a ter impacto direto no tempo de produção.',
        scores: { variation: 3, automation: 1 }
      },
      {
        index: 5,
        label: 'Mais de 10',
        feedback: 'Você já pensa como operação de performance.',
        scores: { variation: 4, automation: 1 }
      },
      {
        index: 6,
        label: 'Gostaria de testar dezenas',
        feedback: 'Esse é exatamente o tipo de uso para o qual o TTK VIDEO MIXER foi criado.',
        scores: { variation: 3, automation: 1 }
      }
    ]
  },
  {
    number: 7,
    key: 'q7',
    question: 'Se pudesse melhorar uma coisa na sua operação hoje, qual seria?',
    options: [
      {
        index: 1,
        label: 'Nunca ficar sem vídeos',
        feedback: 'Uma biblioteca maior de combinações pode ajudar a manter uma reserva de conteúdo.',
        scores: { volume: 2, consistency: 1 }
      },
      {
        index: 2,
        label: 'Gravar menos e produzir mais',
        feedback: 'Esse é o princípio central do Mixer: reaproveitar estrategicamente seus blocos de gravação.',
        scores: { automation: 3, volume: 1 }
      },
      {
        index: 3,
        label: 'Testar mais ideias',
        feedback: 'Quanto menor o custo de produzir uma variação, mais ideias você consegue colocar em teste.',
        scores: { variation: 3 }
      },
      {
        index: 4,
        label: 'Trabalhar mais rápido',
        feedback: 'Reduzir edição mecânica deixa você focar mais na criação.',
        scores: { automation: 2 }
      },
      {
        index: 5,
        label: 'Ter uma rotina organizada',
        feedback: 'Um fluxo repetível facilita transformar produção em rotina.',
        scores: { consistency: 3 }
      },
      {
        index: 6,
        label: 'Escalar minha produção',
        feedback: 'Seu perfil está extremamente alinhado com produção combinatória em escala.',
        scores: { volume: 3, automation: 1 }
      }
    ]
  }
]

export function getQuestionByNumber(number: number): QuizQuestion | undefined {
  return QUIZ_QUESTIONS.find((q) => q.number === number)
}

export const TOTAL_QUESTIONS = QUIZ_QUESTIONS.length
