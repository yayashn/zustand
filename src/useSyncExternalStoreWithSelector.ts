import { useRef, useEffect, useMemo, useDebugValue } from "@rbxts/roact";
import { useSyncExternalStore } from "./useSyncExternalStore";

const objectIs = rawequal

function useSyncExternalStoreWithSelector(subscribe: unknown, getSnapshot: Callback, getServerSnapshot: unknown, selector: Callback, isEqual: Callback) {
    let inst: {
        hasValue: boolean;
        value: unknown;
    };
    const instRef = useRef<typeof inst>();

    if (instRef.current === undefined) {
        inst = {
            hasValue: false,
            value: undefined
        };
        instRef.current = inst;
    } else {
        inst = instRef.current;
    }

    const [getSelection, getServerSelection] = useMemo(() => {
        let hasMemo = false;
        let memoizedSnapshot: unknown;
        let memoizedSelection: unknown;

        const memoizedSelector = (nextSnapshot: unknown) => {
            if (!hasMemo) {
                hasMemo = true;
                memoizedSnapshot = nextSnapshot;
                const _nextSelection = selector(nextSnapshot);

                if (isEqual !== undefined) {
                    if (inst.hasValue) {
                        const currentSelection = inst.value;

                        if (isEqual(currentSelection, _nextSelection)) {
                            memoizedSelection = currentSelection;
                            return currentSelection;
                        }
                    }
                }

                memoizedSelection = _nextSelection;
                return _nextSelection;
            }

            const prevSnapshot = memoizedSnapshot;
            const prevSelection = memoizedSelection;

            if (objectIs(prevSnapshot, nextSnapshot)) {
                return prevSelection;
            }

            const nextSelection = selector(nextSnapshot);
            if (isEqual !== undefined && isEqual(prevSelection, nextSelection)) {
                return prevSelection;
            }

            memoizedSnapshot = nextSnapshot;
            memoizedSelection = nextSelection;
            return nextSelection;
        };

        const maybeGetServerSnapshot = getServerSnapshot === undefined ? undefined : getServerSnapshot;

        const getSnapshotWithSelector = () => {
            return memoizedSelector(getSnapshot());
        };

        const getServerSnapshotWithSelector = maybeGetServerSnapshot === undefined ? undefined : () => {
            return memoizedSelector((maybeGetServerSnapshot as Callback)());
        };
        return [getSnapshotWithSelector, getServerSnapshotWithSelector];
    }, [getSnapshot, getServerSnapshot, selector, isEqual]);

    const value = useSyncExternalStore(subscribe as (handler: () => void) => () => void, getSelection, getServerSelection);
    useEffect(() => {
        inst.hasValue = true;
        inst.value = value;
    }, [value]);

    useDebugValue(value);
    return value;
}

export { useSyncExternalStoreWithSelector };
