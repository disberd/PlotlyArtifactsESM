import { octokit } from "./octokit";
import { maybeReleaseVersion, getLocalRelease } from "./utils";

async function commentAndClose(number, body) {
  // Create comment
  await octokit.rest.issues.createComment({
    owner: process.env.OWNER,
    repo: process.env.REPO,
    issue_number: number,
    body: body
  })
  // Close the issue
  await octokit.rest.issues.update({
    owner: process.env.OWNER,
    repo: process.env.REPO,
    issue_number: number,
    state: "closed"
  })
}
async function issueListener(github_context) {
  const issue = github_context.event.issue
  const title = issue.title
  const number = issue.number
  const pattern = /^release plotly v?(\d+\.\d+\.\d+)$/i
  if (!title.match(pattern)) {
    console.log("Issue does not trigger a release. Skipping.")
    console.log("To trigger a release, the issue title must be of the form: `release plotly vX.Y.Z` (case-insensitive)")
    return
  }
  const version = title.match(/(v?\d+\.\d+\.\d+)/)[1]
  console.log(`Requesting version ${version} based on issue title`)
  let release
  // We try to release
  try {
    await maybeReleaseVersion(version)
    const release_response = getLocalRelease(version)
    release = release_response.data
  } catch (error) {
    let body = "The release failed with the following error message:\n"
    body += error.message
    await commentAndClose(issue.number, body)
    console.log(`Issue #${issue.number} successfully closed.`)
    return
  }
  // We actually released, so we add a link to the release in the comment
  const body = `Release of version ${version} successfully created and available at ${release.html_url}`
  await commentAndClose(issue.number, body)
  console.log(`Issue #${issue.number} successfully closed.`)
}

await issueListener(JSON.parse(process.env.GITHUB_CONTEXT))