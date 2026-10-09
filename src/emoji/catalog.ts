/**
 * The emoji the picker offers, by section.
 *
 * Two rules hold this file together, and both are about how the characters are
 * *drawn* rather than about which ones are popular:
 *
 *  1. Every emoji that defaults to the *text* presentation carries U+FE0F. A
 *     bare `❤` or `✌` is a different character to the font — a monochrome
 *     outline — and asking for the emoji presentation is what turns it into the
 *     coloured one. The ones that default to emoji need nothing.
 *  2. Nothing here relies on a font stack to be colourful; `EmojiPicker` names
 *     the colour fonts itself, because on Windows the fallback chain reaches
 *     Segoe UI Symbol — which has outlined versions of most of these — before it
 *     reaches Segoe UI Emoji. Those two together are the "black outline".
 *
 * Kept as data with no logic so a name can be corrected without touching a
 * component, and so the count is visible: about a hundred and twenty, which is
 * what was asked for.
 */

/**
 * `ParseKeys` cannot see these, so the label is a plain string mapped in
 * `EmojiPicker` — the keys live under `emoji.categories`.
 */
export type EmojiCategoryId =
  | 'smileys'
  | 'emotions'
  | 'gestures'
  | 'hearts'
  | 'animals'
  | 'food'
  | 'activity'
  | 'objects'

export type EmojiCategory = {
  id: EmojiCategoryId
  /**
   * The tab's face: one of its own emoji, so the section is recognisable before
   * its name is read.
   */
  glyph: string
  emoji: readonly string[]
}

export const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    id: 'smileys',
    glyph: '😀',
    emoji: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
      '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘',
    ],
  },
  {
    id: 'emotions',
    glyph: '😢',
    emoji: [
      '😢', '😭', '😡', '😠', '😱', '😨', '😥', '😓',
      '😴', '😵', '🤯', '🥺', '😳', '😬', '🤗', '🤔',
    ],
  },
  {
    id: 'gestures',
    glyph: '👍',
    emoji: [
      '👍', '👎', '👌', '✌️', '🤞', '🤘', '👏', '🙌',
      '🙏', '🤝', '💪', '👋', '✋', '👊', '✊', '🙋',
    ],
  },
  {
    id: 'hearts',
    glyph: '❤️',
    emoji: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '💯', '💥', '✨', '⭐', '🔥', '🎉', '🎁',
    ],
  },
  {
    id: 'animals',
    glyph: '🐶',
    emoji: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐝',
    ],
  },
  {
    id: 'food',
    glyph: '🍎',
    emoji: [
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒',
      '🍑', '🍍', '🥑', '🌽', '🍕', '🍔', '🍰', '☕',
    ],
  },
  {
    id: 'activity',
    glyph: '⚽',
    emoji: [
      '⚽', '🏀', '🎾', '🎯', '🎮', '🎲', '🎸', '🎤',
      '🎬', '🚗', '🚌', '🚑', '🚲', '✈️', '🚀', '⛵',
    ],
  },
  {
    id: 'objects',
    glyph: '💡',
    emoji: [
      '💡', '📱', '💻', '⌨️', '📷', '📺', '⏰', '🔋',
      '💰', '🔑', '🔒', '📦', '📚', '✅', '❌', '❗',
    ],
  },
]
