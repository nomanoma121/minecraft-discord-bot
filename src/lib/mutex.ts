import { Mutex, withTimeout } from "async-mutex";
import { COMMAND_TIMEOUT_MS } from "../constants";

export const mutex = withTimeout(
	new Mutex(),
	COMMAND_TIMEOUT_MS,
	new Error("Mutex acquisition timed out"),
);
