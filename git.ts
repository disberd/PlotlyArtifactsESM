import { $ } from "bun"
import fs from "fs"

console.log(await $`git config user.name`.text())
console.log(await $`git config user.name "Add Plotly Version"`.text())
console.log(await $`git config user.email "add_plotly_version@email.com"`.text())
console.log(await $`git config user.name`.text())
console.log(await $`git config user.email`.text())
fs.writeFileSync("VERSION", process.env.INPUT_VERSION)
console.log(await $`git add VERSION`.text())
console.log(await $`git commit -m "add plotly.js version $(cat VERSION)`.text())
console.log(await $`git push`.text())