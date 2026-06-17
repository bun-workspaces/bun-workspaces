# if not CI=true
if [ "$CI" != "true" ]; then
    # Run pnpm install simply to update pnpm-lock.yaml for Dependabot which fails to read Bun deps
    # TODO: Remove this and pnpm meta files when Dependabot supports Bun (it may likely be broken for catalogs)
    mv node_modules node_modules.ignore-me.backup 
    pnpm install --ignore-scripts
    sleep 1
    mv node_modules.ignore-me.backup node_modules
fi
