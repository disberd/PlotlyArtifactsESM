import { $ } from "bun"

console.log(await $`git config user.name`)
console.log(await $`git config user.name "CI"`)
console.log(await $`git config user.email "CI@example.com"`)
console.log(await $`git config user.name`)
console.log(await $`git config user.email`)