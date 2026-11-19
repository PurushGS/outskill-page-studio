/**
 * The form's questions, as the backend describes them:
 *
 *   defaultStandardQuestion   shown first; the option picked decides which follow-ups appear
 *   standardQuestionsFlow     [{ optionId, followUpQuestions }]
 *   unconditionalQuestions    always shown
 *   scholarshipQuestions      always shown, after the unconditional ones
 *
 * Pure logic with no DOM, so it is easy to test and reuse.
 */
const CHOICE_CATEGORIES = new Set(['ONE_OF_MANY', 'DROPDOWN']);

export class QuestionFlow {
  constructor(data = {}) {
    this.standard = data?.defaultStandardQuestion?.options?.length ? { ...data.defaultStandardQuestion, isStandard: true } : null;
    this.flow = Array.isArray(data?.standardQuestionsFlow) ? data.standardQuestionsFlow : [];
    this.always = [...(data?.unconditionalQuestions || []), ...(data?.scholarshipQuestions || [])];
  }

  get isEmpty() {
    return !this.standard && this.always.length === 0;
  }

  /**
   * Every question on the form once, for the studio's "Questions on this form"
   * list (same order and filtering as the LP admin): the standard question,
   * then all follow-ups of every option, then the always-shown ones. Questions
   * without a title, or whose title is an unfilled [[placeholder]], are skipped.
   */
  all() {
    const seen = new Set();
    const out = [];
    const add = (questions) => questions.forEach((q) => {
      const real = q && typeof q === 'object' && q.title && !/^\[\[.*\]\]$/.test(String(q.title).trim());
      if (real && !seen.has(q.id)) {
        seen.add(q.id);
        out.push(q);
      }
    });
    add(this.standard ? [this.standard] : []);
    this.flow.forEach((block) => add(block.followUpQuestions || []));
    add(this.always);
    return out;
  }

  /** Questions to show, in order, once `standardOptionId` is picked on the standard question (or null). */
  visible(standardOptionId = null) {
    const followUps = standardOptionId == null
      ? []
      : this.flow.find((block) => String(block.optionId) === String(standardOptionId))?.followUpQuestions || [];
    const followUpIds = new Set(followUps.map((q) => q.id));
    return [
      ...(this.standard ? [this.standard] : []),
      ...followUps,
      ...this.always.filter((q) => !followUpIds.has(q.id)),
    ];
  }

  /**
   * The payload the backend's response API takes for one answer, or null if
   * there is nothing to send. `value` is the picked optionId or the typed text.
   */
  /**
   * An answer as one readable field for analytics: the question's title as a
   * snake_case key ("What do you currently do?" → what_do_you_currently_do)
   * and the picked option's title or the typed text. null when unanswered.
   */
  static fieldFor(question, value) {
    const answer = QuestionFlow.answerFor(question, value);
    if (!answer) return null;
    const key = String(question.title || `question_${question.id}`).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || `question_${question.id}`;
    return [key, answer.responses.join(', ')];
  }

  static answerFor(question, value) {
    const base = {
      questionId: question.id,
      formsQuestionIdentityId: question.formsQuestionIdentityId,
      questionType: question.questionType,
      questionCategory: question.questionCategory,
    };
    if (question.options?.length && (CHOICE_CATEGORIES.has(question.questionCategory) || question.isStandard)) {
      const option = question.options.find((o) => String(o.optionId) === String(value));
      return option ? { ...base, responses: [option.title], optionIds: [option.optionId] } : null;
    }
    const text = String(value ?? '').trim();
    return text ? { ...base, responses: [text] } : null;
  }
}
