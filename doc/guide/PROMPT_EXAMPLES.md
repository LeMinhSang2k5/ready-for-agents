# Prompt Example Suite

This suite is used to improve `agent-context-kit prompt` without adding AI API dependencies.

It is not machine-learning training data. It is a deterministic rule-tuning suite: add real prompts, define expected intent/signals, convert the cases into tests, then tune the parser.

## How To Use

- Keep examples close to real user wording, including typos and mixed Vietnamese/English.
- Treat expected intent as the main contract.
- Do not expect the CLI to invent missing facts.
- If the prompt is vague, the expected output should include an unclear/clarification signal.
- Tune rules in small batches: add examples, run tests, adjust classifier/extractor, repeat.

## Intent Guide

| Intent    | Meaning                                                                |
| --------- | ---------------------------------------------------------------------- |
| `explain` | User asks what/why/how a concept or feature works.                     |
| `verify`  | User asks how to confirm behavior, run checks, or validate output.     |
| `review`  | User asks for assessment, code/doc review, risks, or missing cases.    |
| `fix`     | User asks to repair, change, or implement a specific issue.            |
| `clarify` | User request is too vague to act on safely.                            |
| `general` | User asks for planning, drafting, creating docs, or other broad tasks. |

## Examples

| ID   | Lang | Expected intent | Raw prompt                                                              | Expected signals                                            |
| ---- | ---- | --------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| P001 | vi   | explain         | Vì sao tôi nên có tính năng prompt này?                                 | Explain usefulness; mention no invented capabilities.       |
| P002 | en   | explain         | Explain what `agent-context-kit prompt` does and when I should use it.  | Explain purpose, usage, and limits.                         |
| P003 | vi   | explain         | lệnh doctor khác gì với init vậy?                                       | Compare `doctor` and `init`.                                |
| P004 | en   | explain         | What is the difference between dry-run and force in this CLI?           | Explain flags and safety behavior.                          |
| P005 | vi   | explain         | pnpm là gì và vì sao project này dùng pnpm?                             | Explain pnpm; relate to project if context exists.          |
| P006 | en   | explain         | Describe the generated AGENTS.md file in simple terms.                  | Explain AGENTS.md role.                                     |
| P007 | vi   | explain         | hãy giải thích cấu trúc output của prompt gồm những phần nào            | Explain output sections.                                    |
| P008 | en   | explain         | Why should a repo have PROJECT_CONTEXT.md?                              | Explain repo context benefits.                              |
| P009 | vi   | explain         | agent-context-kit có gọi AI API không?                                  | State static/rule-based unless configured otherwise.        |
| P010 | en   | explain         | Explain how package manager detection works.                            | Mention lockfiles/packageManager field if known.            |
| P011 | vi   | explain         | vì sao output markdown nên ngắn gọn cho ai agent?                       | Explain token and clarity benefits without overclaiming.    |
| P012 | en   | explain         | What does machine-readable doctor output mean?                          | Explain JSON output for CI.                                 |
| P013 | vi   | explain         | tôi chưa hiểu fallback label là gì trong command setup                  | Explain fallback package manager label.                     |
| P014 | en   | explain         | Explain the purpose of COMMANDS.md.                                     | Explain commands file and scripts source.                   |
| P015 | vi   | explain         | doctor score dùng để làm gì?                                            | Explain readiness score.                                    |
| P016 | en   | explain         | Why is conservative framework detection important?                      | Explain avoiding false confidence.                          |
| P017 | vi   | explain         | hãy nói dễ hiểu vì sao không nên overwrite file mặc định                | Explain safe writes.                                        |
| P018 | en   | explain         | Explain why prompt optimization should stay rule-based for MVP.         | Explain deterministic/no API MVP.                           |
| P019 | vi   | explain         | tôi muốn hiểu command prompt --stdin dùng khi nào                       | Explain stdin usage.                                        |
| P020 | en   | explain         | What does "do not invent facts" mean for this CLI?                      | Explain anti-hallucination constraint.                      |
| P021 | vi   | verify          | làm sao để biết tính năng doctor hoạt động chính xác?                   | Verify doctor behavior; include expected commands/checks.   |
| P022 | en   | verify          | Verify that `init --dry-run` does not write files.                      | Check dry-run creates no files.                             |
| P023 | vi   | verify          | kiểm tra giúp tôi prompt --json có xuất json hợp lệ không               | Verify JSON parseable output.                               |
| P024 | en   | verify          | How can I confirm package manager detection chooses pnpm?               | Verify with pnpm-lock/packageManager.                       |
| P025 | vi   | verify          | chạy test nào để chắc chắn không overwrite AGENTS.md?                   | Identify init safety tests.                                 |
| P026 | en   | verify          | Check whether the generated COMMANDS.md includes dev and build scripts. | Verify generated command sections.                          |
| P027 | vi   | verify          | làm sao test doctor --json trong CI?                                    | Verify command and expected exit/status.                    |
| P028 | en   | verify          | Confirm that missing cwd exits with an error.                           | Verify validation error.                                    |
| P029 | vi   | verify          | kiểm tra build hiện tại có pass không                                   | Run or suggest build verification.                          |
| P030 | en   | verify          | Verify that prompt input from --file works.                             | Check file source parsing.                                  |
| P031 | vi   | verify          | tôi muốn kiểm tra output prompt có còn bịa command như doctor ho không  | Verify no fake command extraction.                          |
| P032 | en   | verify          | Make sure `prompt --stats` reports token changes correctly.             | Verify stats wording.                                       |
| P033 | vi   | verify          | test xem React/Vite + Express có detect đúng không                      | Verify stack detection.                                     |
| P034 | en   | verify          | Check if README examples match the real CLI commands.                   | Compare docs to implementation.                             |
| P035 | vi   | verify          | chạy typecheck test build giúp tôi                                      | Verify by running typecheck, test, build.                   |
| P036 | en   | verify          | Confirm the npm package tarball contains dist and docs.                 | Verify pack contents.                                       |
| P037 | vi   | verify          | kiểm tra nếu không có test script thì AGENTS.md nói gì                  | Verify testing expectations fallback.                       |
| P038 | en   | verify          | Validate that `--force` overwrites only generated context files.        | Verify force behavior and scope.                            |
| P039 | vi   | verify          | xem command doctor text và json có cùng số check không                  | Compare output modes.                                       |
| P040 | en   | verify          | Confirm prompt keeps the same language in response instructions.        | Verify language preservation.                               |
| P041 | vi   | review          | bạn xem README này đã đủ để publish chưa                                | Review README; find gaps.                                   |
| P042 | en   | review          | Review my prompt command implementation for bugs.                       | Code review stance; identify risks.                         |
| P043 | vi   | review          | kiểm tra doc/guide có đúng với project hiện tại chưa                    | Review docs against project.                                |
| P044 | en   | review          | Review the generated AGENTS.md output for clarity and spacing.          | Assess markdown quality.                                    |
| P045 | vi   | review          | xem test init-safety của tôi ổn chưa                                    | Review tests and missing cases.                             |
| P046 | en   | review          | Please review the package.json publish config.                          | Check files/bin/scripts metadata.                           |
| P047 | vi   | review          | bạn đánh giá tính năng doctor --json có thiếu gì không                  | Review JSON schema and CI usefulness.                       |
| P048 | en   | review          | Audit the prompt parser for false positives.                            | Find extraction/classification risks.                       |
| P049 | vi   | review          | xem giúp tôi CHANGELOG.md có chuyên nghiệp chưa                         | Review changelog quality.                                   |
| P050 | en   | review          | Check if the docs overpromise AI capabilities.                          | Review claims; avoid overclaiming.                          |
| P051 | vi   | review          | bạn xem cấu trúc src/prompt hiện tại có sạch không                      | Review source organization.                                 |
| P052 | en   | review          | Review whether this CLI is ready for npm publish.                       | Review readiness checklist.                                 |
| P053 | vi   | review          | xem output dry-run này còn lỗi spacing không                            | Review formatting/spacing.                                  |
| P054 | en   | review          | Inspect the detector tests for missing framework cases.                 | Review detector coverage.                                   |
| P055 | vi   | review          | bạn kiểm tra roadmap có hợp lý với MVP không                            | Review scope and roadmap.                                   |
| P056 | en   | review          | Review the CLI help text for user confusion.                            | Check command docs/help.                                    |
| P057 | vi   | review          | xem file PROMPT_SPEC.md đã đủ để implement chưa                         | Review spec completeness.                                   |
| P058 | en   | review          | Check for stale dist files before packaging.                            | Review build/package hygiene.                               |
| P059 | vi   | review          | đánh giá output prompt này có giữ đúng ý người dùng không               | Review semantic preservation.                               |
| P060 | en   | review          | Review if the fallback labels are readable for beginners.               | Review labels and docs clarity.                             |
| P061 | vi   | fix             | sửa lỗi prompt nhận nhầm `doctor ho` thành command                      | Fix command extraction false positive.                      |
| P062 | en   | fix             | Fix `prompt --file` so missing files show a clean error.                | Handle file read error.                                     |
| P063 | vi   | fix             | chỉnh spacing trong AGENTS.md cho đẹp hơn                               | Improve markdown spacing.                                   |
| P064 | en   | fix             | Fix the doctor JSON output so CI can parse it without extra text.       | Pure JSON output.                                           |
| P065 | vi   | fix             | sửa fallback label npm fallback cho bớt rối                             | Clean fallback wording.                                     |
| P066 | en   | fix             | Make `init --dry-run` avoid writing any files.                          | Ensure dry-run safety.                                      |
| P067 | vi   | fix             | sửa test prompt bị fail khi input tiếng Việt có dấu                     | Fix Unicode/Vietnamese handling.                            |
| P068 | en   | fix             | Fix stats so it does not say negative shorter.                          | Correct stats wording.                                      |
| P069 | vi   | fix             | thêm validate nếu cwd không tồn tại thì báo lỗi rõ                      | Add cwd validation.                                         |
| P070 | en   | fix             | Prevent prompt from accepting both --stdin and argument input.          | Add source conflict validation.                             |
| P071 | vi   | fix             | cập nhật README cho đúng command doctor --json                          | Fix docs command example.                                   |
| P072 | en   | fix             | Fix type errors in the prompt pipeline.                                 | Resolve TypeScript issues.                                  |
| P073 | vi   | fix             | sửa package tarball để không chứa file thừa trong dist                  | Clean build/package config.                                 |
| P074 | en   | fix             | Add missing tests for prompt intent classification.                     | Add coverage.                                               |
| P075 | vi   | fix             | sửa generator để không tạo dòng trống dư ở Important Folders            | Polish output spacing.                                      |
| P076 | en   | fix             | Make framework detection show React/Vite + Express.                     | Fix combined stack label.                                   |
| P077 | vi   | fix             | thêm constraints chống bịa đặt trong prompt output                      | Add safety constraints.                                     |
| P078 | en   | fix             | Fix `doctor` to fail fast when cwd is a file.                           | Validate cwd directory.                                     |
| P079 | vi   | fix             | sửa docs vì đang nói quá về tối ưu token                                | Reduce overclaiming.                                        |
| P080 | en   | fix             | Update tests after adding prompt examples.                              | Maintain test suite.                                        |
| P081 | vi   | clarify         | tôi muốn làm prompt thông minh hơn nhưng chưa biết bắt đầu từ đâu       | Ask for scope or propose example-suite first.               |
| P082 | en   | clarify         | I want this to support every language perfectly.                        | Mark overbroad; ask target languages.                       |
| P083 | vi   | clarify         | làm sao để biến câu dài thành prompt tốt?                               | Need target output style if unspecified.                    |
| P084 | en   | clarify         | Improve this output please.                                             | Unclear because no output provided.                         |
| P085 | vi   | clarify         | bạn sửa cái lỗi đó giúp tôi                                             | Unclear: which file/error.                                  |
| P086 | en   | clarify         | Make it better but do not change too much.                              | Need define "better" and constraints.                       |
| P087 | vi   | clarify         | prompt này đúng chưa?                                                   | Need prompt content.                                        |
| P088 | en   | clarify         | Add support for my framework.                                           | Need framework name and detection signals.                  |
| P089 | vi   | clarify         | tôi muốn publish nhưng còn sợ lỗi                                       | Need ask which publish target/checklist if not known.       |
| P090 | en   | clarify         | Can you train the command?                                              | Clarify rule tuning vs ML training.                         |
| P091 | vi   | clarify         | thêm file md đó đi                                                      | Need which file and content.                                |
| P092 | en   | clarify         | Check the project I just updated.                                       | Need repo path if current context missing.                  |
| P093 | vi   | clarify         | command này lag quá                                                     | Need exact command/output/environment.                      |
| P094 | en   | clarify         | Make the generator production ready.                                    | Need quality criteria/scope.                                |
| P095 | vi   | clarify         | tôi muốn tối ưu token cho mọi câu lệnh                                  | Clarify limits; avoid guarantee.                            |
| P096 | en   | clarify         | Generate context for backend too.                                       | Need backend stack/detection requirements.                  |
| P097 | vi   | clarify         | làm sao để biết nó hoạt động chính xác                                  | Need feature name if absent.                                |
| P098 | en   | fix             | Fix package manager detection.                                          | Fix detector behavior; inspect missing cases if needed.     |
| P099 | vi   | clarify         | hãy thêm test cho cái này                                               | Need feature/file under test.                               |
| P100 | en   | fix             | Update docs to match the code.                                          | Update stale documentation after inspecting implementation. |
| P101 | vi   | general         | tạo cho tôi quy trình thực hiện tính năng prompt                        | Produce implementation workflow.                            |
| P102 | en   | general         | Create a publish checklist for version 0.1.0.                           | Generate checklist.                                         |
| P103 | vi   | general         | viết README cho agent-context-kit bằng tiếng Việt                       | Draft README.vi.md.                                         |
| P104 | en   | general         | Add a roadmap for prompt optimization.                                  | Produce roadmap.                                            |
| P105 | vi   | general         | hãy tạo bộ ví dụ prompt gồm nhiều câu Việt Anh                          | Create examples suite.                                      |
| P106 | en   | general         | Design a JSON schema for doctor output.                                 | Produce schema/spec.                                        |
| P107 | vi   | general         | lập kế hoạch 7 ngày để hoàn thiện MVP                                   | Create plan.                                                |
| P108 | en   | general         | Write a GitHub issue template for bug reports.                          | Create template.                                            |
| P109 | vi   | general         | đề xuất tên section trong PROJECT_CONTEXT.md                            | Suggest section names.                                      |
| P110 | en   | general         | Create test cases for framework detection.                              | Generate test cases.                                        |
| P111 | vi   | general         | hãy viết AGENTS.md mẫu cho repo React Express                           | Draft sample AGENTS.md.                                     |
| P112 | en   | general         | Convert these requirements into implementation tasks.                   | Break down tasks.                                           |
| P113 | vi   | general         | tạo checklist kiểm tra trước khi pnpm pack                              | Create pack checklist.                                      |
| P114 | en   | general         | Draft docs for `agent-context-kit prompt --stdin`.                      | Write docs.                                                 |
| P115 | vi   | general         | hãy tạo spec cho command update trong tương lai                         | Draft future command spec.                                  |
| P116 | en   | general         | Propose folder structure for adding Python detection.                   | Design structure.                                           |
| P117 | vi   | general         | viết phần giới thiệu ngắn cho GitHub repo                               | Draft intro/tagline.                                        |
| P118 | en   | general         | Create examples for prompt false-positive tests.                        | Generate test examples.                                     |
| P119 | vi   | general         | lên kế hoạch cải thiện doctor score                                     | Produce improvement plan.                                   |
| P120 | en   | general         | Write concise release notes for v0.1.0.                                 | Draft release notes.                                        |

## Mixed-Language Stress Cases

| ID   | Lang | Expected intent | Raw prompt                                                               | Expected signals                   |
| ---- | ---- | --------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| M001 | mix  | verify          | check giúp tôi doctor --json có valid JSON không                         | Verify JSON output; mixed VI/EN.   |
| M002 | mix  | fix             | fix lỗi spacing trong PROJECT_CONTEXT.md đi, output đang dư blank line   | Fix markdown spacing.              |
| M003 | mix  | review          | review giúp README xem publish ready chưa                                | Review publish readiness.          |
| M004 | mix  | explain         | explain vì sao prompt không nên gọi AI API trong MVP                     | Explain deterministic MVP.         |
| M005 | mix  | clarify         | improve cái này cho professional hơn                                     | Need content and target.           |
| M006 | mix  | general         | tạo checklist trước khi npm publish bằng tiếng Việt                      | Produce checklist in Vietnamese.   |
| M007 | mix  | verify          | chạy pnpm test rồi tell me failed cases nếu có                           | Run tests and summarize failures.  |
| M008 | mix  | fix             | sửa command extraction để không biến tiếng Việt thành shell command fake | Fix false command extraction.      |
| M009 | mix  | review          | audit prompt parser for hallucination risk                               | Review safety risks.               |
| M010 | mix  | explain         | prompt --stats token estimate có chính xác tuyệt đối không?              | Explain rough estimate and limits. |
