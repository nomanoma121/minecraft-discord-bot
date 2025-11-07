import Docker from "dockerode";
import type { Server } from "./types/server";

export const docker = new Docker();

export type Labels = Partial<Server>;

export const filterLabelBuilder = (opts: Labels) => {
  return [
    "name"
  ]
}
