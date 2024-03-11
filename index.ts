import { maybeReleaseVersion } from "./utils";

await maybeReleaseVersion(process.env.INPUT_VERSION)