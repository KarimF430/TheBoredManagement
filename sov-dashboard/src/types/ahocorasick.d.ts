/**
 * Minimal type declarations for `ahocorasick`, which ships no types of its own.
 * Without this the production build fails type checking.
 */
declare module 'ahocorasick' {
  export default class AhoCorasick {
    constructor(keywords: string[])
    /** Returns [endIndex, matchedKeywords[]] pairs for every hit in `text`. */
    search(text: string): Array<[number, string[]]>
  }
}
