import { Octokit } from "octokit";
import semver from "semver";

const octokit = new Octokit({
    auth: process.env.TOKEN,
});

async function next_unreleased(current_version = "v0.0.0") {
  const iterator = octokit.paginate.iterator(
    "GET /repos/{owner}/{repo}/releases",
    {
      owner: "plotly",
      repo: "plotly.js",
      per_page: 100,
    }
  );
  current_version = semver.coerce(current_version ?? "v0.0.0")
  let breakLoop = false
  let smallest_version: string | null = null

  for await (const { data: releases } of iterator) {
    if (breakLoop) break
    for (const release of releases) {
        let this_version = release.name
        if (semver.gt(this_version, current_version)) {
            smallest_version = this_version
        } else {
            break
        }
    }
  }

  return smallest_version
}

// console.log(await next_unreleased())
console.log(process.env.TOKEN)