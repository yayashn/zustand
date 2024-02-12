import { useState, useEffect, useLayoutEffect, useDebugValue } from "@rbxts/roact";
import { is } from "./object";

interface Snapshot<T> {
	getSnapshot: () => T;
	value: T;
}

function checkIfSnapshotChanged<T>(inst: Snapshot<T>): boolean {
	const latestGetSnapshot = inst.getSnapshot;
	const prevValue = inst.value;

	try {
		const nextValue = latestGetSnapshot();
		return !is(prevValue, nextValue);
	} catch (error) {
		return true;
	}
}

export function useSyncExternalStore<T>(subscribe: (handler: () => void) => () => void, getSnapshot: () => T): T {
	const value = getSnapshot();
	const [{ inst }, forceUpdate] = useState({ inst: { value, getSnapshot } });

	useLayoutEffect(() => {
		inst.value = value;
		inst.getSnapshot = getSnapshot;

		if (checkIfSnapshotChanged(inst)) {
			forceUpdate({ inst });
		}
	}, [subscribe, value, getSnapshot]);

	// if one of the functions errors, we can have the name
	// of the function in the stack trace by doing this
	function useSyncEffect() {
		if (checkIfSnapshotChanged(inst)) {
			forceUpdate({ inst });
		}
		function handleStoreChange() {
			if (checkIfSnapshotChanged(inst)) {
				forceUpdate({ inst });
			}
		}
		return subscribe(handleStoreChange);
	}
	useEffect(useSyncEffect, [subscribe]);

	useDebugValue(value);
	return value;
}
