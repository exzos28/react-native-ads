# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces) and [Turborepo](https://turborepo.dev/). Each ad network integration lives in its own package under `packages/`:

- `packages/unity` — `@react-native-ads/unity`
- `packages/pangle` — `@react-native-ads/pangle`
- `packages/liftoff` — `@react-native-ads/liftoff`
- `packages/levelplay` — `@react-native-ads/levelplay`

Each package has its own `example/` app you use to test changes to that package.

To get started, make sure you have the correct version of [Node.js](https://nodejs.org/) installed (see [`.nvmrc`](./.nvmrc)), then run in the repository root:

```sh
yarn
```

> This project relies on Yarn workspaces — you cannot use `npm` for development without manually migrating.

These packages use [Nitro Modules](https://nitro.margelo.com/). You need to run [Nitrogen](https://nitro.margelo.com/docs/nitrogen) to generate the boilerplate code — the example apps will not build without this step. Run it whenever you change a `*.nitro.ts` file, or when running a package for the first time (generated files aren't committed):

```sh
yarn workspace @react-native-ads/<name> nitrogen
```

Each package's example app is configured to use the local version of that package — JS changes are reflected without a rebuild, native changes require rebuilding the example.

To work with a specific package from the repo root:

```sh
yarn workspace @react-native-ads/unity example start
yarn workspace @react-native-ads/unity example android
yarn workspace @react-native-ads/unity example ios
```

(swap `unity` for `pangle`, `liftoff`, or `levelplay`)

Run these across every package from the repo root:

```sh
yarn build       # build all packages
yarn typecheck   # type-check all packages
yarn lint        # lint all packages
yarn lint --fix  # fix formatting errors
yarn test        # run unit tests for all packages
```

Turborepo scopes each of these to only the packages affected by your change when run in CI, but always runs the full set locally unless you pass `--filter`, e.g. `yarn turbo run test --filter=@react-native-ads/pangle`.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for commit messages (`fix`, `feat`, `refactor`, `docs`, `test`, `chore`). Pre-commit hooks verify this format.

### Adding a changeset

Every pull request that changes a published package's behavior should include a changeset:

```sh
yarn changeset
```

This walks you through selecting which package(s) changed and the semver bump (patch/minor/major), and writes a markdown file under `.changeset/` describing the change — that file becomes the changelog entry. Merging to `main` accumulates changesets into a "Version Packages" PR; merging that PR publishes the updated packages to npm automatically via CI.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change, in one package.
- Include a changeset if the change should ship a new version.
- Verify that linters and tests are passing.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
