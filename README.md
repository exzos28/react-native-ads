# @react-native-ads

[Nitro Modules](https://nitro.margelo.com/) bridges for popular mobile ad networks.

| Package | Network | npm |
| --- | --- | --- |
| [`packages/unity`](packages/unity) | Unity Ads | [`@react-native-ads/unity`](https://www.npmjs.com/package/@react-native-ads/unity) |
| [`packages/pangle`](packages/pangle) | Pangle | [`@react-native-ads/pangle`](https://www.npmjs.com/package/@react-native-ads/pangle) |
| [`packages/liftoff`](packages/liftoff) | Liftoff Monetize (Vungle) | [`@react-native-ads/liftoff`](https://www.npmjs.com/package/@react-native-ads/liftoff) |
| [`packages/levelplay`](packages/levelplay) | LevelPlay (ironSource) mediation | [`@react-native-ads/levelplay`](https://www.npmjs.com/package/@react-native-ads/levelplay) |

Each package is independent — install only the ones you need. See each package's own README for install instructions and API usage.

## Repository layout

```
packages/
  unity/       @react-native-ads/unity + its own example app
  pangle/      @react-native-ads/pangle + its own example app
  liftoff/     @react-native-ads/liftoff + its own example app
  levelplay/   @react-native-ads/levelplay + its own example app
apps/
  expo-example/    Expo (dev-client) app demonstrating all four packages together
  rn-cli-example/  Bare React Native CLI app demonstrating all four packages together
```

`packages/*/example` are minimal per-package apps used to develop and test that one native module in isolation. `apps/*` are combined showcase apps that install all four packages side by side, covering both the Expo-managed and bare React Native CLI consumption paths.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full development workflow (building, linting, testing, adding a changeset).

```sh
yarn install
yarn build
yarn lint
yarn typecheck
yarn test
```

## Releasing

Packages are versioned and published independently via [Changesets](https://github.com/changesets/changesets). Every change that should ship a new version needs a changeset (`yarn changeset`); merging to `main` accumulates changesets into a "Version Packages" PR, and merging that PR publishes the updated packages to npm automatically via CI.

## License

MIT
