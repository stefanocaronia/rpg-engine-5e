// The code of the 5e (D-448, D-514): what its data cannot say, through the hooks the engine calls. For now the dying point (DIE-1–DIE-6).
import type { PackageEntry } from "rpg-engine";
import { dyingCode } from "./dying.ts";

const fifthEdition: PackageEntry = () => dyingCode;

export default fifthEdition;
