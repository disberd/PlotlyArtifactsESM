# Scope
The purpose of this repository is to provide a bundled ESM version of the [plotly.js](https://github.com/plotly/plotly.js) library that is easy to access, especially as an Artifact from Julia packages (e.g. [PlutoPlotly.jl](https://github.com/JuliaPluto/PlutoPlotly.jl)).

To do so, the code in this library will simply download a specific version of the plotly.js library, bundle it using [Bun](https://bun.sh/docs/bundler) and upload it in a github release of the same version number as the corresponding plotly.js version.
The bundled ESM module is uploaded as a release asset both directly with the `.mjs` extension, and as a `.tar.gz` archive which contains the `.mjs` file as well as a `VERSION` file with the plotly.js version contained in the archive.

The bundle is not committed to the repository itself to avoid polluting the history but it's only uploaded as a release asset.
If one is interested in directly loading from the web the plotly library as ESM module it is sufficient to use the https://esm.sh service like so with the following example format for version 2.30.0 of the library:
- https://esm.sh/plotly.js-dist-min@2.30.0

The `.tar.gz` asset is particularly useful for use as Artifact and can be easily added to any julia repository using the following code adapted from the README of [`ArtifactUtils.jl`](https://github.com/JuliaPackaging/ArtifactUtils.jl):
```julia
julia> using ArtifactUtils

julia> add_artifact!(
    "Artifacts.toml",
    "plotly-esm-min", # You can customize the artifact name here
    "https://github.com/disberd/PlotlyArtifactsESM/releases/download/v2.26.0/plotly-esm-min.tar.gz",
    force=true,
)
```

# New versions
The bundling and publishing of the new releases of `plotly.js` should happen automatically via [github actions](https://github.com/disberd/PlotlyArtifactsESM/actions/workflows/check_and_release.yaml). 

For currently un-released version, like most of version before 2.26.0 or new versions before they are released in the periodic action, it is also possible to trigger a release by opening an issue on this repository with the title in this format:
- `release plotly vX.Y.Z`


Another github action listens to new issues with that title format and takes care of automatically releasing the requested version. See for example the following issues:
- https://github.com/disberd/PlotlyArtifactsESM/issues/10
- https://github.com/disberd/PlotlyArtifactsESM/issues/7