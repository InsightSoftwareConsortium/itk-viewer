# ITK-Viewer

[![Build and test](https://github.com/InsightSoftwareConsortium/itk-viewer/actions/workflows/test.yml/badge.svg)](https://github.com/InsightSoftwareConsortium/itk-viewer/actions/workflows/test.yml)

_View and interact with multi-dimensional images, geometry, and point sets._

The ITK-Viewer a **modern**, **elegant visualization library** to that enables **easier**, **faster**, and more **sustainable insights** into your data.

ITK-Viewer makes it more _enjoyable_ and _seamless_ to add _beautiful visualizations_ to your software.

Rendering and user interface components can be flexibly combined and customized when integrated into web browser, terminal, and traditional desktop applications. Standard Web Components follow the [HTML First](https://html-first.com/) philosophy.

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

1. In the branch that makes the modifications (or in another branch if you forgot)
   run `pnpm changeset`. Commit the changeset markdown file.
1. Make a PR on `main` branch and merge. `release.yml` workflow sees there is
   a new changeset markdown file and creates a new `chore: update versions` PR.
1. When ready to publish, merge the `chore: update version` PR on main and `release.yml`
   will publish new NPM packages.

Recipe that was followed to setup changesets in this repo:

https://pnpm.io/using-changesets#releasing-changes
