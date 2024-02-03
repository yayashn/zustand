import { useRef, useEffect, useMemo, useDebugValue } from "@rbxts/roact";
import { useSyncExternalStore } from "./useSyncExternalStore";
import { is } from "./object";

type Selector<Snapshot, Selected> = (snapshot: Snapshot) => Selected;
type EqualityFunction<Selected> = (left: Selected, right: Selected) => boolean;

type Inst<Selected> =
	| {
			hasValue: false;
			value: undefined;
	  }
	| {
			hasValue: true;
			value: Selected;
	  };

export function useSyncExternalStoreWithSelector<Snapshot, Selected>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => Snapshot,
	selector: Selector<Snapshot, Selected>,
	isEqual?: EqualityFunction<Selected>,
) {
	const instReference = useRef<Inst<Selected> | undefined>(undefined);
	let inst: Inst<Selected>;

	if (instReference.current === undefined) instReference.current = inst = { hasValue: false, value: undefined };
	else inst = instReference.current;

	const getSelection = useMemo(() => {
		let hasMemo = false;
		let memoizedSnapshot: Snapshot | undefined;
		let memoizedSelection: Selected | undefined;

		const memoizedSelector: Selector<Snapshot, Selected> = (nextSnapshot) => {
			if (!hasMemo) {
				hasMemo = true;
				memoizedSnapshot = nextSnapshot;

				const nextSelection = selector(nextSnapshot);
				if (isEqual !== undefined && inst.hasValue === true) {
					const currentSelection = inst.value;
					if (isEqual(currentSelection, nextSelection)) {
						memoizedSelection = currentSelection;
						return currentSelection;
					}
				}

				memoizedSelection = nextSelection;
				return nextSelection;
			}

			const previousSnapshot = memoizedSnapshot;
			const previousSelection = memoizedSelection!;
			if (is(previousSnapshot, nextSnapshot)) return previousSelection as Selected;

			const nextSelection = selector(nextSnapshot);
			if (isEqual?.(previousSelection as Selected, nextSelection)) return previousSelection as Selected;

			memoizedSnapshot = nextSnapshot;
			memoizedSelection = nextSelection;
			return nextSelection;
		};

		const getSnapshotWithSelector = (): Selected => memoizedSelector(getSnapshot());
		return getSnapshotWithSelector;
	}, [getSnapshot, selector, isEqual]);

	const value = useSyncExternalStore(subscribe, getSelection);
	useEffect(() => {
		inst.hasValue = true;
		inst.value = value;
	}, [value]);

	useDebugValue(value);
	return value;
}
