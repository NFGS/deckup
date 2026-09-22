# @deckup/config

Shared configuration presets for the DeckUp monorepo.

## TypeScript

| Preset                | Use case                                   |
| --------------------- | ------------------------------------------ |
| `tsconfig/base.json`  | Strict baseline for any TypeScript package |
| `tsconfig/node.json`  | Node.js / NestJS packages (NodeNext)       |
| `tsconfig/react.json` | React + Vite packages (bundler resolution) |

Usage:

```json
{
  "extends": "@deckup/config/tsconfig/node.json"
}
```
