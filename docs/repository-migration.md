# GitHub publication record

Published on **2026-10-20T23:49:24+05:30** to [vijayanand1505/ApexAgents](https://github.com/vijayanand1505/ApexAgents), after the owner explicitly selected public visibility. This is a repository publication; it is not a new Vercel deployment or an organizer submission.

## What was preserved

- All **43 commits** present before the first push, including the newly committed saved landing-footer edit.
- Author and committer identities, timestamps, commit messages and the development sequence.
- The complete current project tree, verified by matching tree object IDs before and after sanitization.
- Contributor credits, studio provenance and the original event demo checkpoint `feaa0f3919336e3dfd65cece5cd189b5a7ecd161`.

## Why some commit IDs changed

A targeted history check found an OpenAI-style key in one old `.env.example` blob. A separate publishing clone replaced that historical value with the existing example placeholder. The current `.env.example` was already sanitized, so no current application file changed during filtering.

This changed **14 commit IDs**; the other **29** stayed identical. No commits were dropped or squashed. The value is absent from the published history. The key's owner should still revoke it: redaction cannot undo its earlier presence in local/shared copies or conversation records.

The original history was preserved locally in an ignored, owner-only backup and a private Git ref. Those contain the original sensitive history and must remain private. The original GitHub source repository was not modified, and no force-push was performed. The local working branch was aligned only after the published and original current trees were confirmed identical.

## Remotes and future work

```text
origin    https://github.com/vijayanand1505/ApexAgents.git
upstream  https://github.com/amarnath3003/SquadLings.git
main      tracks origin/main
```

Use normal `git push` from `main` for authorized future checkpoints. Original historical records retain their recorded commit IDs; use the map below when locating an affected checkpoint in this new repository. Vercel continues using the existing manual deployment workflow; no automatic Git integration was enabled during publication.

## Commit map

The [complete old → published commit map](reference/github-publication-commit-map.txt) includes all 43 pre-publication commits. Unchanged entries repeat the same ID. Changed entries are summarized here:

| Previous ID | Published ID | Commit |
| --- | --- | --- |
| `04fe35384ce7` | `f67952e8c2e2` | docs: record run controls deployment and verification |
| `13c7b5e587e0` | `87b5b0cff5e0` | feat: add ApexAgents BuggyMart URLs and local comparison |
| `1d96bbae7af7` | `9e48c1f787b5` | style: include saved landing footer credits |
| `263b1f651cce` | `8009ea3ffaff` | docs: explain current project setup hosting and contributions |
| `4e9761ea89bb` | `e0a1705423d1` | feat: add squad sizing recovery and speed presets |
| `5998087a0315` | `79aa187f434b` | docs: clarify Node runtime for landing preview |
| `612ed52d91bb` | `4e036cc99d41` | feat: focus final results after agents finish |
| `7ff1b93b4c69` | `0c494469b652` | docs: simplify landing footer credit |
| `8777d158eeba` | `3759068bc271` | fix: synchronize launch-film agents and polish player |
| `9b709cea9305` | `5d1e780509a7` | fix: deploy ApexAgents under Vijay's Vercel account |
| `b0f4a2620370` | `25faecfa1a29` | refactor: rename project to ApexAgents and correct ownership |
| `bc0cd122867f` | `31513b432413` | fix: support installed Chrome for agent browsers |
| `cd2f40a27a3d` | `2c83ac316a93` | docs: record startup fixes and local setup |
| `dc641dfe58d6` | `799461f52d48` | docs: credit Amarnath in landing footer |

## Verification

The first upload attempt failed with an HTTP 400 transport error while the target remained empty. A subsequent normal push succeeded using HTTP/1.1 and a larger request buffer. GitHub reported the repository as public with `main` as the default branch. The sanitized copy's targeted scan checked 716 text/commit objects without finding remaining matches for the checked credential formats. The frontend TypeScript check passed for the included footer edit; publication notes are documentation only.

This targeted scan is not a guarantee that all possible sensitive information is absent. Ignored `.env` files, profiles, run data, private sharing links, migration tools and the original-history backup were excluded from publication.
