## 0.0.x
- fix overlay conflict between bs modal and jquery.mmenu
- add task to download github release for jquery.mmenu (latest version not available on npm).

## 0.0.2
- replace `loadDB` with `loadAllStores` and add promises to ensure that data stores
are loaded *before* UI initialization starts. The `loadAllStores` function does not
manage version changes : it **always** upload stores from server when available.

*data store synchronization must be improved and include local xml import*
