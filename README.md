Port of Zustand for roblox-ts. Only tested for usage with @rbxts/react-ts, vanilla stores have not tested and may or may not work.

### Slightly edited Zustand guide

A small, fast and scalable bearbones state-management solution using simplified flux principles. Has a comfy API based on hooks, isn't boilerplatey or opinionated.

```bash
npm install @rbxts/zustand # or yarn add @rbxts/zustand or pnpm add @rbxts/zustand
```

## First create a store

Your store is a hook! You can put anything in it: primitives, objects, functions. State has to be updated immutably and the `set` function [merges state](./docs/guides/immutable-state-and-merging.md) to help it.

```tsx
import { create } from 'zustand'

type BearState = {
    bears: number
    increasePopulation: () => void
    removeAllBears: () => void
}

const useBearStore = create<BearState>((set) => ({
    bears: 0,
    increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 })
}))
```

## Then bind your components, and that's it!

Use the hook anywhere, no providers are needed. Select your state and the component will re-render on changes.

```jsx
function BearCounter() {
  const bears = useBearStore.store((state) => state.bears)
  return <textlabel Text={`${bears}`}/>
}

function Controls() {
  const increasePopulation = useBearStore.store((state) => state.increasePopulation)
  return <textbutton Event={{
    MouseButton1Click: () => {
        increasePopulation()
    }
  }} Text="One up"/>
}
```

### Why zustand over redux?

- Simple and un-opinionated
- Makes hooks the primary means of consuming state
- Doesn't wrap your app in context providers
- [Can inform components transiently (without causing render)](#transient-updates-for-often-occurring-state-changes)

### Why zustand over context?

- Less boilerplate
- Renders components only on changes
- Centralized, action-based state management

---

# Recipes

## Fetching everything

You can, but bear in mind that it will cause the component to update on every state change!

```jsx
const state = useBearStore()
```

## Selecting multiple state slices

It detects changes with strict-equality (old === new) by default, this is efficient for atomic state picks.

```jsx
const nuts = useBearStore.store((state) => state.nuts)
const honey = useBearStore.store((state) => state.honey)
```

## Using zustand without React (NOT TESTED)

Zustand core can be imported and used without the React dependency. The only difference is that the create function does not return a hook, but the API utilities.

```jsx
import { createStore } from 'zustand/vanilla'

const store = createStore(() => ({ ... }))
const { getState, setState, subscribe } = store

export default store
```

You can use a vanilla store with `useStore` hook available since v4.

```jsx
import { useStore } from 'zustand'
import { vanillaStore } from './vanillaStore'

const useBoundStore = (selector) => useStore(vanillaStore, selector)
```

:warning: Note that middlewares that modify `set` or `get` are not applied to `getState` and `setState`.

## Transient updates (for often occurring state-changes)

The subscribe function allows components to bind to a state-portion without forcing re-render on changes. Best combine it with useEffect for automatic unsubscribe on unmount. This can make a [drastic](https://codesandbox.io/s/peaceful-johnson-txtws) performance impact when you are allowed to mutate the view directly.

```jsx
const useScratchStore = create(set => ({ scratches: 0, ... }))

const Component = () => {
  // Fetch initial state
  const scratchRef = useRef(useScratchStore.getState().scratches)
  // Connect to the store on mount, disconnect on unmount, catch state-changes in a reference
  useEffect(() => useScratchStore.subscribe(
    state => (scratchRef.current = state.scratches)
  ), [])
  ...
```