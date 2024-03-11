import { octokit } from "./octokit.ts";
import semver from "semver";
import fs from "fs";
import path from "path";
import tar from "tar";
import { $ } from "bun";
import _ from "lodash";

/* Generic */
// Make the version full semver format with preceding v
function normalizeVersion(version: string) {
  return `v${semver.coerce(version).version}`;
}

// Extract the semver version from the VERSION file in the calling directory
function versionFromFile() {
  let version = fs.readFileSync("VERSION").toString();
  if (semver.valid(version) === null) {
    throw new Error(`VERSION file contains invalid version ${version}`);
  }
  version = normalizeVersion(version);
  return version;
}

/* Release Extraction */

// Get latest local release
export async function latestLocalRelease() {
  return await octokit.rest.repos.getLatestRelease({
    owner: process.env.OWNER,
    repo: process.env.REPO,
  });
}
// Get version of the latest local release
export async function latestLocalVersion() {
  const latest_release = await latestLocalRelease();
  return latest_release.data.tag_name;
}
// Get local release with target version. Providing "latest" will return the latest release and undefined is returned if the target release version does not exist
export async function getLocalRelease(version: string) {
  if (version === "latest") {
    return await latestLocalRelease();
  }
  version = normalizeVersion(version);
  try {
    return await octokit.rest.repos.getReleaseByTag({
      owner: process.env.OWNER,
      repo: process.env.REPO,
      tag: version,
    });
  } catch (error) {
    return undefined;
  }
}

export async function latestPlotlyRelease() {
  return await octokit.rest.repos.getLatestRelease({
    owner: "plotly",
    repo: "plotly.js",
  });
}
export async function latestPlotlyVersion() {
  const latest_release = await latestPlotlyRelease();
  return latest_release.data.tag_name;
}
export async function getPlotlyRelease(version: string) {
  if (version === "latest") {
    return await latestPlotlyRelease();
  }
  version = normalizeVersion(version);
  try {
  return await octokit.rest.repos.getReleaseByTag({
    owner: "plotly",
    repo: "plotly.js",
    tag: version,
  });
    } catch (error) {
    return undefined;
  }
}

// Returns an object containing the version of the first unreleased plotly version (library vs local) as well as the number of remaining unreleased versions
export async function firstUnreleased() {
  const iterator = octokit.paginate.iterator(
    "GET /repos/{owner}/{repo}/releases",
    {
      owner: "plotly",
      repo: "plotly.js",
      per_page: 100,
    }
  );
  const current_version = await latestLocalVersion();
  let breakLoop = false;
  let n_unreleased = 0
  let first_unreleased: string | undefined = undefined;

  for await (const { data: releases } of iterator) {
    if (breakLoop) break;
    for (const release of releases) {
      let this_version = release.tag_name;
      if (semver.gt(this_version, current_version)) {
        first_unreleased = this_version;
        n_unreleased += 1
      } else {
        break;
      }
    }
  }

  return { first_unreleased, n_unreleased };
}

interface ReleasesData {
  local_release: any;
  plotly_release: any;
  version: string;
}
export async function extractReleases(version:string) {
  version = normalizeVersion(version);
  // Make sure that the provided version does not exists already
  const release_reponse = await getLocalRelease(version);
  const local_release = release_reponse?.data

  // Extract the plotly.js corresponding release to ensure it exists and to extract the html url
  const plotly_release_response = await getPlotlyRelease(version);
  return {
    local_release,
    plotly_release: plotly_release_response?.data,
    version
  }
}
export async function createLocalRelease(inp: string | ReleasesData, options = {}) {
  const rdata = (typeof inp === "string") ? await extractReleases(inp) : inp
  const { local_release, plotly_release, version } = rdata;
  if (plotly_release === undefined) {
    throw new Error(`Release with version ${version} does not exist in the plotly.js library`);
  }
  if (local_release !== undefined) {
    throw new Error(`Release with version ${version} already exists locally`);
  }
  _.defaults(options, {
    owner: process.env.OWNER,
    repo: process.env.REPO,
    tag_name: version,
    name: version,
    body: `[plotly.js release](${plotly_release.html_url})`,
    target_commitish: undefined,
    make_latest: "legacy", // This make releases always appear in semantic version order even if created out of order
  });

  const create_response = await octokit.rest.repos.createRelease(options);
  return create_response.data
}

export async function commitNewVersion(inp: string | ReleasesData) {
  const rdata = (typeof inp === "string") ? await extractReleases(inp) : inp
  const { local_release, plotly_release, version } = rdata;
  if (local_release !== undefined) {
    console.log(`Release with version ${version} already exists`);
    return false;
  }
  // Otherwise, we check if the VERSION file already exists and has the correct version
  if (
    fs.existsSync("VERSION") &&
    fs.readFileSync("VERSION").toString() === version
  ) {
    console.log(`VERSION file exists and already contains version ${version}.`);
    return true;
  }
  // We write to the file
  fs.writeFileSync("VERSION", version);
  // We commit the changed version. NOTE: We directly call the shell commands now but we should consider using the API in the future
  await $`git config user.name "Add Plotly Version"`;
  await $`git config user.email "add_plotly_version@email.com"`;
  await $`git add VERSION`;
  await $`git commit -m "add plotly.js version $(cat VERSION)`;
  await $`git push`;
  return true;
}

export async function getReleaseAssets(inp: string | ReleasesData) {
  const rdata = (typeof inp === "string") ? await extractReleases(inp) : inp
  const { local_release: release, version } = rdata;
  if (release === undefined) {
    throw new Error(`Release with version ${version} does not exist`);
  }
  const release_id = release.data.id;
  return await octokit.rest.repos.listReleaseAssets({
    owner: process.env.OWNER,
    repo: process.env.REPO,
    release_id: release_id,
  });
}

// Build the plotly artifact taking the version from the VERSION file
export async function buildArtifact(options: object = {}) {
  _.defaults(options, {
    bundle_name: "plotly-esm-min.mjs",
    outdir: "./out",
    tar_name: "plotly-esm-min.tar.gz",
  });
  const version = versionFromFile();
  const { bundle_name, outdir, tar_name } = options;
  // ensure that we have a full semver version
  // Install the plotly version
  await $`bun install plotly.js-dist-min${version.replace("v", "@")}`
  // Build the bundle
  await Bun.build({
    entrypoints: ["./plotly_esm.ts"],
    outdir: outdir,
    minify: true,
    naming: `[dir]/${bundle_name}`,
  });
  // Write the specified version to file
  fs.writeFileSync(path.join(outdir, "VERSION"), version);
  // Create the zip containing the module and VERSION
  await tar.create(
    {
      gzip: true,
      file: tar_name,
      cwd: outdir,
    },
    [bundle_name, "VERSION"]
  );
}

export async function uploadReleaseArtifact(options = {}) {
  // Extract the version from the VERSION file
  const version = versionFromFile();
  // Ensure that the release already exists
  const release = await getLocalRelease(version);
  if (release === undefined) {
    throw new Error(
      `Release with version ${version} does not exist. Please create it first.`
    );
  }
  const release_id = release.data.id;
  // Build the artifact first
  await buildArtifact(options);
  const { tar_name } = options;
  const fileContents = fs.readFileSync(tar_name);
  let response = await octokit.rest.repos.uploadReleaseAsset({
    headers: {
      "content-type": "application/gzip",
    },
    owner: process.env.OWNER,
    repo: process.env.REPO,
    release_id: release_id,
    data: fileContents,
    name: tar_name,
  });
  return response
}

export async function maybeReleaseVersion(inp: string | ReleasesData) {
  const rdata = (typeof inp === "string") ? await extractReleases(inp) : inp
  const { local_release, plotly_release, version } = rdata;
  if (plotly_release === undefined) {
    console.log(`Release with version ${version} does not exist in the plotly library. Skipping.`)
    return
  }
  if (local_release !== undefined) {
    console.log(`Release with version ${version} already exists locally. Skipping.`)
    return
  }
  console.log(`Creating new release with version ${version}...`)
}