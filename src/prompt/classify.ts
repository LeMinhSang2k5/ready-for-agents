import type { PromptIntent } from "./types.js";

const REVIEW_PATTERN =
  /(?:kiểm tra|review|xem|check|rà soát|đánh giá|audit|inspect)/iu;
const REVIEW_QUALITY_PATTERN =
  /(?:đủ|ổn|thiếu|chuyên nghiệp|hợp lý|giữ đúng ý|readable|ready|publish ready|bugs?|risks?|overpromise|readiness|audit)/iu;
const FIX_PATTERN =
  /(?:sửa|fix|khắc phục|repair|sửa lỗi|sửa bug|chỉnh|prevent|add missing|update tests|update docs|cập nhật.+cho đúng|thêm.+(?:validate|constraints?|test)|make (?!sure\b).+(?:avoid|show|fail|parse|report))/iu;
const HOW_TO_PATTERN =
  /(?:^|\s)(làm sao|làm thế nào|cách|how to|how do|how can)(?=\s|$)/iu;
const EXPLAIN_WHY_PATTERN = /(?:vì sao|tại sao|why|nên có|should i|worth it)/iu;
const EXPLAIN_HOW_PATTERN =
  /(?:như thế nào|là gì|what is|what's|có tác dụng|tác dụng|hoạt động|lợi ích)/iu;
const EXPLAIN_GUIDE_PATTERN =
  /(?:hướng dẫn|cách dùng|cách sử dụng|how to use)/iu;
const EXPLAIN_ACTION_PATTERN =
  /(?:^|\s)(explain|describe|tôi muốn hiểu|giải thích)(?=\s|$)/iu;
const GENERAL_CREATION_PATTERN =
  /^(?:hãy\s+|please\s+)?(?:create|draft|design|write|propose|convert|tạo|viết|lập kế hoạch|lên kế hoạch|đề xuất)(?=\s|$)/iu;
const VERIFY_RUN_PATTERN =
  /\b(test|typecheck|type-check|build|verify|pnpm|npm|yarn|bun|vitest|jest|chạy)\b/i;
const VAGUE_TARGET_PATTERN = /(?:^|\s)(cái này|nó|đó|this|it)(?=\s|$|[,.])/iu;
const AMBIGUOUS_QUALITY_PATTERN = /\b(tốt hơn|better|improve|nâng cấp)\b/i;
const CLARIFY_PATTERN =
  /(?:chưa biết bắt đầu|every language perfectly|support every language|my framework|cái lỗi đó|file md đó|just updated|lag quá|production ready|backend too|mọi câu lệnh|sợ lỗi|này đúng chưa|biến câu dài thành prompt tốt|train the command)/iu;
const VERIFY_PATTERN =
  /(?:^|\s)(verify|confirm|validate|make sure)(?=\s|$)|check whether|check if|chạy.+(?:pnpm|test|typecheck|type-check|build)|nếu không có.+thì|có .+(?:không|chưa)|pass không|hợp lệ|valid json|hoạt động chính xác|chắc chắn|detect đúng|match|contains|keeps|cùng số|xuất json|parseable/iu;

export function isExplainIntent(text: string): boolean {
  if (GENERAL_CREATION_PATTERN.test(text)) return false;
  if (FIX_PATTERN.test(text) || REVIEW_PATTERN.test(text)) return false;
  if (
    EXPLAIN_ACTION_PATTERN.test(text) ||
    EXPLAIN_WHY_PATTERN.test(text) ||
    EXPLAIN_HOW_PATTERN.test(text) ||
    EXPLAIN_GUIDE_PATTERN.test(text) ||
    /cấu trúc|structure/i.test(text)
  ) {
    return true;
  }
  return text.includes("?") && !VERIFY_RUN_PATTERN.test(text);
}

export function isVerifyIntent(text: string): boolean {
  const hasExplicitVerifyCue =
    /(?:verify|confirm|validate|make sure|check|kiểm tra|chạy|test|typecheck|build|pass|hợp lệ|valid|detect|match|contains|keeps|hoạt động chính xác)/iu.test(
      text,
    );
  if (isExplainIntent(text) && !hasExplicitVerifyCue) return false;
  if (REVIEW_QUALITY_PATTERN.test(text)) return false;
  if (/(?:cấu trúc|structure).+(?:hiện tại|current|sạch|clean)/iu.test(text)) {
    return false;
  }
  if (/(?:doc\/guide|docs?).+(?:đúng với project|overpromise)/iu.test(text)) {
    return false;
  }
  if (VERIFY_PATTERN.test(text)) return true;
  return (
    HOW_TO_PATTERN.test(text) &&
    /\b(doctor|kiểm tra|verify|hoạt động chính xác|confirm)\b/i.test(text)
  );
}

export function isClarifyIntent(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  const vague = VAGUE_TARGET_PATTERN.test(text);
  const ambiguous = AMBIGUOUS_QUALITY_PATTERN.test(text);
  if (CLARIFY_PATTERN.test(text)) return true;
  if (vague && /(?:thêm|add|đúng chưa|hoạt động chính xác)/iu.test(text)) {
    return true;
  }
  if (vague && ambiguous) return true;
  if (wordCount <= 6 && ambiguous) return true;
  if (wordCount <= 4 && vague) return true;
  return false;
}

export function classifyPromptIntent(
  text: string,
  _segments: string[],
): PromptIntent {
  if (isClarifyIntent(text)) return "clarify";
  if (GENERAL_CREATION_PATTERN.test(text) && !FIX_PATTERN.test(text)) {
    return "general";
  }
  if (/^(verify|confirm|validate|make sure)\b/iu.test(text)) return "verify";
  if (
    REVIEW_PATTERN.test(text) &&
    /(?:đừng|không|tránh|avoid|do not|don't|never).*(?:sửa|fix|edit|modify)/iu.test(
      text,
    )
  ) {
    return "review";
  }
  if (FIX_PATTERN.test(text)) return "fix";
  if (isVerifyIntent(text)) return "verify";
  if (REVIEW_PATTERN.test(text)) return "review";
  if (isExplainIntent(text)) return "explain";
  return "general";
}
