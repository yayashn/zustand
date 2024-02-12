import { useDebugValue } from "@rbxts/roact";
// import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
// This doesn't work in ESM, because use-sync-external-store only exposes CJS.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import { createStore } from "./vanilla";
import type { Mutate, StateCreator, StoreApi, StoreMutatorIdentifier } from "./vanilla";
import { useSyncExternalStoreWithSelector } from "./useSyncExternalStoreWithSelector";
import Object from "@rbxts/object-utils";

type ExtractState<S> = S extends { getState: () => infer T } ? T : never;

type ReadonlyStoreApi<T> = Pick<StoreApi<T>, "getState" | "subscribe">;

type WithReact<S extends ReadonlyStoreApi<unknown>> = S & {
	getServerState?: () => ExtractState<S>;
};

export function useStore<S extends WithReact<StoreApi<unknown>>>(api: S): ExtractState<S>;

export function useStore<S extends WithReact<StoreApi<unknown>>, U>(api: S, selector: (state: ExtractState<S>) => U): U;

/**
 * @deprecated Use `useStoreWithEqualityFn` from 'zustand/traditional'
 * https://github.com/pmndrs/zustand/discussions/1937
 */
export function useStore<S extends WithReact<StoreApi<unknown>>, U>(
	api: S,
	selector: (state: ExtractState<S>) => U,
	equalityFn: ((a: U, b: U) => boolean) | undefined,
): U;

export function useStore<TState, StateSlice>(
	api: WithReact<StoreApi<TState>>,
	selector: (state: TState) => StateSlice = api.getState as never,
	equalityFn?: (a: StateSlice, b: StateSlice) => boolean,
) {
	const slice = useSyncExternalStoreWithSelector(api.subscribe, api.getState, selector, equalityFn);
	useDebugValue(slice);
	return slice;
}

export type UseBoundStore<S extends WithReact<ReadonlyStoreApi<unknown>>> = {
	(): ExtractState<S>;
	<U>(selector: (state: ExtractState<S>) => U): U;
	/**
	 * @deprecated Use `createWithEqualityFn` from 'zustand/traditional'
	 */
	<U>(selector: (state: ExtractState<S>) => U, equalityFn: (a: U, b: U) => boolean): U;
} & S;

type Create = {
	<T, Mos extends [StoreMutatorIdentifier, unknown][] = []>(
		initializer: StateCreator<T, [], Mos>,
	): UseBoundStore<Mutate<StoreApi<T>, Mos>>;
	<T>(): <Mos extends [StoreMutatorIdentifier, unknown][] = []>(
		initializer: StateCreator<T, [], Mos>,
	) => UseBoundStore<Mutate<StoreApi<T>, Mos>>;
	/**
	 * @deprecated Use `useStore` hook to bind store
	 */
	<S extends StoreApi<unknown>>(store: S): UseBoundStore<S>;
};

const createImpl = <T>(createState: StateCreator<T, [], []>) => {
	const api = (
		typeIs(createState, "function") ? createStore(createState as StateCreator<T, [], []>) : createState
	) as WithReact<StoreApi<unknown>>;

	const useBoundStore = {} as UseBoundStore<WithReact<StoreApi<T>>>;

	Object.assign(useBoundStore, api);

	setmetatable(useBoundStore, {
		__call: ((t, selector?: Callback, equalityFn?: Callback) =>
			useStore(api, selector!, equalityFn)) as UseBoundStore<WithReact<StoreApi<T>>>,
	});

	return useBoundStore;
};

export const create = (<T>(createState: StateCreator<T, [], []> | undefined) =>
	createState ? createImpl(createState) : createImpl) as Create;

/**
 * @deprecated Use `import { create } from 'zustand'`
 */
export default ((createState: never) => {
	return create(createState);
}) as Create;
