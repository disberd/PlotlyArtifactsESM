import { maybeReleaseVersion, firstUnreleased } from "./utils";

async function checkAndRelease() {
  const {first_unreleased, n_unreleased} = await firstUnreleased();
  if (first_unreleased === undefined) {
    console.log(`There are no unreleased versions.`);
    return
  }
  console.log(`Found unrelease version ${first_unreleased}, trying to release it locally.`);
  // We try and release
  await maybeReleaseVersion(first_unreleased)
}

await checkAndRelease()

