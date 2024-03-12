import { maybeReleaseVersion, firstUnreleased } from "./utils";

async function checkAndRelease() {
  const {first_unreleased, n_unreleased} = await firstUnreleased();
  if (first_unreleased === undefined) {
    console.log(`There are no unreleased versions.`);
    return
  }
  // We try and release
  await maybeReleaseVersion(first_unreleased)
}

await checkAndRelease()

