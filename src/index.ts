// The code of the 5e (D-448): what its data cannot say, through the hooks the engine calls. For now the dying point (DIE-1–DIE-6).
import type { SystemEntry } from "rpg-engine";
import { dyingHooks } from "./dying.ts";

const fifthEdition: SystemEntry = () => dyingHooks;

export default fifthEdition;
