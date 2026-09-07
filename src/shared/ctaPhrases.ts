import { balancedSequence } from './rng'

/**
 * Built-in bank of visual CTA phrases (Brazilian Portuguese). Note: unlike
 * the original design, this list intentionally DOES include urgency/
 * scarcity phrasing ("últimas unidades", "restam poucas") — replaced at the
 * user's explicit request, overriding the earlier "no fabricated urgency"
 * rule.
 */
export const CTA_PHRASES: readonly string[] = [
  'Aperte na sacolinha laranja e garanta agora!',
  'Clique na sacolinha laranja e aproveite!',
  'Toque na sacolinha laranja e confira agora!',
  'Compre pela sacolinha laranja antes que acabe!',
  'Garanta o seu na sacolinha laranja!',
  'Corre na sacolinha laranja e aproveite!',
  'Aproveite agora pela sacolinha laranja!',
  'Toque na sacolinha laranja e garanta o seu!',
  'Clique na sacolinha laranja e compre agora!',
  'Veja na sacolinha laranja e aproveite a oferta!',
  'Compre na sacolinha laranja enquanto ainda tem!',
  'Garanta pela sacolinha laranja antes que acabe!',
  'Corre pra sacolinha laranja antes que esgote!',
  'Aperte na sacolinha laranja e não perca!',
  'Clique na sacolinha laranja antes que termine!',
  'Toque na sacolinha laranja antes que acabe!',
  'Compre agora pela sacolinha laranja!',
  'Garanta o seu clicando na sacolinha laranja!',
  'Veja a oferta na sacolinha laranja agora!',
  'Aproveite na sacolinha laranja enquanto dá tempo!',
  'Poucas unidades! Compre na sacolinha laranja!',
  'Últimas unidades! Corre na sacolinha laranja!',
  'Tá acabando! Garanta na sacolinha laranja!',
  'Restam poucas! Clique na sacolinha laranja!',
  'Poucas peças disponíveis! Vá na sacolinha laranja!',
  'Corre! Acesse a sacolinha laranja agora!',
  'Não deixa pra depois, clique na sacolinha laranja!',
  'Aproveite antes que acabe na sacolinha laranja!',
  'Garanta agora pela sacolinha laranja!',
  'Toque na sacolinha laranja enquanto ainda tem!',
  'A oferta está na sacolinha laranja. Aproveite!',
  'Corre pra sacolinha laranja e garanta o seu!',
  'Clique agora na sacolinha laranja!',
  'Garanta antes que esgote na sacolinha laranja!',
  'Não perde! Tá na sacolinha laranja!',
  'Aproveite agora clicando na sacolinha laranja!',
  'Compre na sacolinha laranja antes que seja tarde!',
  'Corre que está saindo rápido! Sacolinha laranja!',
  'Clique na sacolinha laranja antes que esgote!',
  'Toque na sacolinha laranja e aproveite agora!',
  'Poucas unidades disponíveis na sacolinha laranja!',
  'Garanta sua unidade na sacolinha laranja!',
  'Corre e compra pela sacolinha laranja!',
  'Tá quase acabando! Sacolinha laranja!',
  'Clique na sacolinha laranja e não fique sem!',
  'Aproveite antes que acabe. Sacolinha laranja!',
  'Garanta já pela sacolinha laranja!',
  'Compre agora clicando na sacolinha laranja!',
  'Corre na sacolinha laranja enquanto ainda está disponível!',
  'Não perde essa! Clique na sacolinha laranja!',
  'Veja e compre pela sacolinha laranja agora!',
  'Restam poucas unidades na sacolinha laranja!',
  'Garanta enquanto ainda tem na sacolinha laranja!',
  'Toque na sacolinha laranja e aproveite enquanto dá tempo!',
  'Clique agora na sacolinha laranja e garanta!',
  'Aproveite essa chance pela sacolinha laranja!',
  'Corre antes que acabe! Sacolinha laranja!',
  'Garanta o seu agora na sacolinha laranja!',
  'Tá disponível na sacolinha laranja. Aproveite!',
  'Compre antes que acabe pela sacolinha laranja!',
  'Clique na sacolinha laranja enquanto ainda tem!',
  'Corre e aproveita pela sacolinha laranja!',
  'Garanta agora. É só clicar na sacolinha laranja!',
  'Poucas unidades! Aperte na sacolinha laranja!',
  'Tá acabando rápido! Clique na sacolinha laranja!',
  'Aproveite enquanto está disponível na sacolinha laranja!',
  'Garanta a sua unidade pela sacolinha laranja!',
  'Clique na sacolinha laranja e aproveite antes que acabe!',
  'Corre pra garantir na sacolinha laranja!',
  'Não deixa passar. Tá na sacolinha laranja!',
  'Toque na sacolinha laranja e compre antes que acabe!',
  'Últimas peças! Vá na sacolinha laranja!',
  'Restam poucas unidades. Sacolinha laranja!',
  'Compre agora na sacolinha laranja!',
  'Garanta o seu antes que acabe na sacolinha laranja!',
  'Corre! Clique na sacolinha laranja e aproveite!',
  'Aproveite já na sacolinha laranja!',
  'Tá quase esgotando. Sacolinha laranja!',
  'Clique na sacolinha laranja e garanta antes que termine!',
  'Toque agora na sacolinha laranja!',
  'Poucas unidades! Garanta na sacolinha laranja!',
  'Não fique sem. Compre na sacolinha laranja!',
  'Corre enquanto ainda tem na sacolinha laranja!',
  'Aproveite agora pela sacolinha laranja antes que acabe!',
  'Garanta na sacolinha laranja enquanto está disponível!',
  'Clique na sacolinha laranja e aproveite agora!',
  'Tá saindo rápido! Sacolinha laranja!',
  'Compre antes que esgote na sacolinha laranja!',
  'Toque na sacolinha laranja e não perca!',
  'Corre pra sacolinha laranja e garanta já!',
  'Garanta agora enquanto ainda tem na sacolinha laranja!',
  'Poucas unidades restantes! Sacolinha laranja!',
  'Clique na sacolinha laranja antes que acabe de vez!',
  'Aproveite antes que termine na sacolinha laranja!',
  'Compre já pela sacolinha laranja!',
  'Não perca tempo. Clique na sacolinha laranja!',
  'Restam poucas! Garanta pela sacolinha laranja!',
  'Corre! Tá disponível na sacolinha laranja!',
  'Garanta a sua agora clicando na sacolinha laranja!',
  'Últimas unidades disponíveis na sacolinha laranja!',
  'Toque na sacolinha laranja e garanta antes que acabe!',
  'Aproveite agora. É só clicar na sacolinha laranja!',
  'Tá quase no fim! Corre na sacolinha laranja!',
  'Compre enquanto ainda tem pela sacolinha laranja!',
  'Aperte na sacolinha laranja e garanta antes que esgote!'
] as const

export interface DistributedItem<T> {
  index: number
  value: T
}

/**
 * Distributes `values` across `count` slots as evenly as possible, and
 * avoids the exact same value repeating on two consecutive slots whenever
 * there is more than one value to choose from.
 */
export function distributeEvenly<T>(values: readonly T[], count: number, seed: number): T[] {
  const sequence = balancedSequence(values, count, seed)

  if (values.length <= 1) return sequence

  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] === sequence[i - 1]) {
      for (let j = i + 1; j < sequence.length; j++) {
        if (sequence[j] !== sequence[i - 1] && sequence[j] !== sequence[i]) {
          [sequence[i], sequence[j]] = [sequence[j], sequence[i]]
          break
        }
      }
    }
  }

  return sequence
}

export function distributeCtaPhrases(count: number, seed: number): string[] {
  return distributeEvenly(CTA_PHRASES, count, seed)
}
