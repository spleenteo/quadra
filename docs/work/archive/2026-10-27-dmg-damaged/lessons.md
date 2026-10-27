# Lessons — dmg-damaged

- Capture a build's exit code without a pipe (`cmd > log 2>&1; echo "exit=$?"`) and report it; "no errors in the output" is not an exit code.
- Don't assert exact `spctl` output from documentation or memory: it changes across macOS versions. Check it on the host, and back it with `syspolicy_check distribution`, which names the actual issues.
- `rm` is blocked by a hook in this environment: temp cleanup goes through `del` (Trash) or the session scratchpad.
