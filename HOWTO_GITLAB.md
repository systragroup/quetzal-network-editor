How to configure Gitlab
=======================

Mandatory settings
------------------

- General ≫ Repository → Active
- General ≫ Repository ≫ CI/CD → Active
- General ≫ Container Registry → Active
- Repository ≫ Deploy keys → Add a key that grand **write permissions**:
  ```sh
  $ ssh-keygen -t ed25519 -C "To push tags from gitlab CI" -f key
  $ cat key.pub
  ```
  Copy the last part into `Title` field and the first part into `Key` field.
- CI/CD ≫ Variables → Add a `DEPLOY_KEY_TO_TAG` file variable:
  Use the content of `key` for `Value` field.
  Use `Type` `File`.
  Don’t protect nor mask the variable.

Recommended settings
--------------------

- Merge requests ≫ Merge method → Merge commit with semi-linear history
- Merge requests ≫ Merge options → Enable the "Delete source branch" option by default
- Merge requests ≫ Squash commits when merging -> Allow
- Merge requests ≫ Merge checks → Pipelines must succeed
- Merge requests ≫ Merge checks → All threads must be resolved
- Repository ≫ Protected branches → remove `master` or `main` branch or allow to force push from developers
- CI/CD ≫ Runners ≫ Shared runners → Enable shared runners to **disabled**
