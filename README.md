# itk-viewer

[![Build and test](https://github.com/InsightSoftwareConsortium/itk-viewer/actions/workflows/test.yml/badge.svg)](https://github.com/InsightSoftwareConsortium/itk-viewer/actions/workflows/test.yml)

## Development

Contributions are welcome and appreciated.

### Build and test

```sh
npm i -g pnpm
pnpm i
pnpm build
pnpm test
```

### Watch rebuild packages and run Vite dev server

```sh
npm i -g pnpm
pnpm i
pnpm dev
```

Then open `http://localhost:5173/` in browser

### Publish Steps

1. In the branch that makes the modifications (or in another branch if you forgot) run `pnpm changeset`. Commit the changeset markdown file.
1. Make a PR on `main` branch and merge.
1. `release.yml` workflow sees there is a new changeset markdown file and creates a new `chore: update versions` PR.
1. When ready to publihs, merge the `chore: update version` PR on main and `release.yml` will publish new NPM packages.

Recipe that was followed to setup changesets in this repo:

https://pnpm.io/using-changesets#releasing-changes
