# Login refinement and DNS repair, 2026-10-10

The working Vercel alias previously returned HTTP 403 for sign-in because the server accepted the custom domain and individual deployment hostname, but omitted its own public alias. The production origin allowlist now includes exactly `aster.kcmira.me` and `aster-ruddy.vercel.app`; unrelated hosts and lookalikes remain blocked. Twelve server tests pass, including this regression.

Sign-in and ID creation are directly accessible from the title screen while world assets load. Returning signed-in visitors enter their existing journey; incomplete orientation resumes instead of replaying the opening. Account screens use clearer labels, readable type, larger fields, distinct sign-in/create options and visible request status. Seven account-screen tests and the full-App title-to-sign-in test pass. The smaller-laptop layout keeps sign-in and password controls in view. Profile-only updates no longer replace the current journal with an older session snapshot. Session refresh responses are ignored after a newer account transition.

The domain failure was reproduced through ordinary DNS on the learner's computer. Its Wi-Fi primary DNS server returned ENOTFOUND while its secondary resolved the existing correct CNAME. Flushing the cache alone did not help. With the learner's explicit approval and Windows administrator confirmation, the two existing Wi-Fi DNS servers were reordered. Normal Windows DNS now resolves Aster; no third-party DNS provider, hosts-file override or certificate bypass was used.

Production browser verification is recorded after this release is deployed. No claim of form-feedback accuracy follows from these account and DNS checks.
