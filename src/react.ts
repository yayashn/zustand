import { useDebugValue } from '@rbxts/roact'
// import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
// This doesn't work in ESM, because use-sync-external-store only exposes CJS.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
// eslint-disable-next-line import/extensions
import { createStore } from './vanilla'
import type {
  Mutate,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
} from './vanilla'
import { useSyncExternalStoreWithSelector } from './useSyncExternalStoreWithSelector'

type ExtractState<S> = S extends { getState: () => infer T } ? T : never

type ReadonlyStoreApi<T> = Pick<StoreApi<T>, 'getState' | 'subscribe'>

type WithReact<S extends ReadonlyStoreApi<unknown>> = S & {
  getServerState?: () => ExtractState<S>
}

let didWarnAboutEqualityFn = false

export function useStore<S extends WithReact<StoreApi<unknown>>>(
  api: S
): ExtractState<S>

export function useStore<S extends WithReact<StoreApi<unknown>>, U>(
  api: S,
  selector: (state: ExtractState<S>) => U
): U

/**
 * @deprecated Use `useStoreWithEqualityFn` from 'zustand/traditional'
 * https://github.com/pmndrs/zustand/discussions/1937
 */
export function useStore<S extends WithReact<StoreApi<unknown>>, U>(
  api: S,
  selector: (state: ExtractState<S>) => U,
  equalityFn: ((a: U, b: U) => boolean) | undefined
): U

export function useStore<TState, StateSlice>(
  api: WithReact<StoreApi<TState>>,
  selector: (state: TState) => StateSlice = api.getState as any,
  equalityFn?: (a: StateSlice, b: StateSlice) => boolean
) {
  const slice = useSyncExternalStoreWithSelector(
    api.subscribe,
    api.getState,
    api.getServerState || api.getState,
    selector,
    equalityFn as Callback
  )
  useDebugValue(slice)
  return slice
}

export type UseBoundStore<S extends WithReact<ReadonlyStoreApi<unknown>>> = {
  (): ExtractState<S>
  <U>(selector: (state: ExtractState<S>) => U): U
  /**
   * @deprecated Use `createWithEqualityFn` from 'zustand/traditional'
   */
  <U>(
    selector: (state: ExtractState<S>) => U,
    equalityFn: (a: U, b: U) => boolean
  ): U
} & S

type StoreWithBoundFunction<S extends WithReact<StoreApi<unknown>>> = {
  store: UseBoundStore<S>;
} & S;

type Create = {
  <T, Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>
  ): StoreWithBoundFunction<Mutate<StoreApi<T>, Mos>>;
  <T>(): <Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>
  ) => StoreWithBoundFunction<Mutate<StoreApi<T>, Mos>>;
  /**
   * @deprecated Use `useStore` hook to bind store
   */
  <S extends StoreApi<unknown>>(store: S): StoreWithBoundFunction<S>;
};

const createImpl = <T>(createState: StateCreator<T, [], []> | WithReact<StoreApi<T>>): StoreWithBoundFunction<WithReact<StoreApi<T>>> => {
  const api: WithReact<StoreApi<T>> = 
    typeOf(createState) === 'function' 
      ? createStore(createState as StateCreator<T, [], []>) 
      : (createState as WithReact<StoreApi<T>>);

  const useBoundStore: UseBoundStore<WithReact<StoreApi<T>>> = ((selector?: any, equalityFn?: any): any => 
    useStore(api, selector, equalityFn)) as unknown as UseBoundStore<WithReact<StoreApi<T>>>;

  return {
    ...api,
    store: useBoundStore
  };
}


export const create = (<T>(createState: StateCreator<T, [], []> | undefined) =>
  createState ? createImpl(createState) : createImpl) as Create

/**
 * @deprecated Use `import { create } from 'zustand'`
 */
export default ((createState: any) => {
  return create(createState)
}) as Create