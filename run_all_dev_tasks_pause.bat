@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

REM Ensure we are in a git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: Not inside a git repository.
  pause
  exit /b 1
)

REM One-time: commit/push this runner if it changed (optional)
git add run_all_dev_tasks_pause.bat >nul 2>&1
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore: add/update all-dev pause runner"
  git push
)

REM Run assistant: implement stories one-by-one from latest anchor, pause between each
codemie-claude --dangerously-skip-permissions --task "No hardcoding. Do not ask me for Jira keys or run-ids.

Goal: implement the selected stories for the latest capstone run, one branch per story, with a pause gate between each.

Steps:
1) In Jira project EPMCDMETST, find the most recent Anchor task with labels 'gap-analysis' and 'capstone' (ORDER BY created DESC).
2) From the Anchor description, extract the 'Selected stories:' list (comma-separated keys).
3) For each Story key in that list, in the same order:
   a) Create and checkout branch feature/<STORY_KEY>.
   b) Implement ONLY that story per its Jira acceptance criteria.
   c) Commit with message '<STORY_KEY>: <short summary>' (one or more commits).
   d) Push branch to origin.
   e) Comment on the Jira story with branch name, commit hashes, and local run/verify steps.
   f) STOP and ask the user to type the word 'continue' before starting the next story (HITL gate).
4) Do NOT merge. Do NOT create a combined branch.
Start now with the first story and wait for 'continue' between stories."

pause