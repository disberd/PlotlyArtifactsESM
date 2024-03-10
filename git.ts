import { $ } from "bun"

console.log(await $`git config user.name`.text())
console.log(await $`git config user.name "CI"`.text())
console.log(await $`git config user.email "CI@example.com"`.text())
console.log(await $`git config user.name`.text())
console.log(await $`git config user.email`.text())
console.log(process.env.INPUT_VERSION)